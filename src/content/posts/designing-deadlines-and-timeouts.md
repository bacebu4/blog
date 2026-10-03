---
title: "Designing Deadlines and Timeouts"
author: Vasilii Krasikov
pubDatetime: 2026-10-03T12:00:00.000Z
featured: false
tags:
  - distributed systems
  - system design
draft: false
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/designing-deadlines-and-timeouts.png?raw=true
description: "Compute each call timeout from one request-wide deadline instead of splitting the latency budget into fixed timeouts"
---

Requirement: the client waits **at most 200 ms** for a response.

A fixed timeout on every downstream call does not meet the requirement, because a fixed timeout bounds only one call. The fix is to **compute each call timeout at call time**, from the time left until one deadline that the whole request shares.

## Example

We have three dependencies:

| Dependency           | p50   | p99.9  | Required           |
| -------------------- | ----- | ------ | ------------------ |
| `A`, user profile    | 10 ms | 40 ms  | Yes                |
| `B`, pricing         | 30 ms | 90 ms  | Yes                |
| `C`, recommendations | 25 ms | 120 ms | No, has a fallback |

Our service calls `A`, then `B`, then `C`, because each call needs the result of the previous one. Our own work takes 20 ms.

## Why fixed timeouts fail

Split the 200 ms in advance, so that the fixed timeouts add up to exactly 200 ms:

- `A` gets 40 ms.
- `B` gets 100 ms.
- `C` gets 40 ms.
- Own work gets 20 ms.

The split fails in two ways:

- A call _cannot use time that an earlier call did not use_.
  - `A` answers in 10 ms, and `B` needs 105 ms, 5 ms more than its timeout. `B` times out, and the request fails. At that moment 90 ms of the 200 ms are still left, and `C` and our own work need at most 60 ms of them.
- A retry does not fit. A retry of `B` needs another 100 ms that the split does not have.

![Fixed split: the request fails while 90 ms are still left](https://github.com/bacebu4/blog/blob/master/cdn/deadlines-1-fixed-split.svg?raw=true)

## Set one deadline per request

Both failures have one cause: each timeout is fixed before the request starts. The fix is to _compute each call timeout when the call starts_, from the time left. To know the time left, our service must know when the client stops waiting. That point in time is the **deadline**.

- The first service that receives the client's request sets the deadline once. The deadline is the arrival time plus 200 ms.
- The caller sets the call timeout on each call. The called service receives it as its own deadline and computes its own call timeouts from it.

## Compute each call timeout from the time left

The caller computes the timeout of each call from the time left when it makes the call:

$$
\text{call timeout} = \min(\text{deadline} - \text{now} - \text{reserve},\ \text{per-dependency cap})
$$

The **reserve** is the time our service needs after the call returns: merging, serializing, and the trip back to the caller.

### Per-dependency cap

The **per-dependency cap** is the longest time we wait for one dependency, even when more time is left. Pick it from an acceptable rate of false timeouts, timeouts on calls that would have succeeded. [Amazon](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) picks a rate such as 0.1% and uses the matching latency percentile, p99.9.

In this example, the caps are:

- `A` gets 50 ms, its p99.9 of 40 ms plus some extra time.
- `B` gets 110 ms, its p99.9 of 90 ms plus some extra time.
- `C` gets 60 ms, less than its p99.9 of 120 ms, because `C` has a fallback. We accept more false timeouts on `C` so that the page loads sooner.

### Minimum timeout

If the call timeout is too small for the dependency to reply, the call will probably time out. Give each dependency a **minimum timeout**, for example its p50 latency. If the call timeout is less than the minimum timeout, **do not make the call.** Use the fallback, or return an error if the dependency is required.

## Apply the formula to a chain of calls

Each call needs the result of the previous one, so the reserve also includes **minimum timeouts** (p50 in our example) for all the _required_ calls still to come. Do not reserve time for optional calls.

Take the chain from "Why fixed timeouts fail" with the same latencies.

- `A` starts at 0 ms. The reserve is 20 ms (own work) plus `B`'s minimum timeout of 30 ms, total 50 ms. `A` gets min(200 − 0 − 50, 50) = 50 ms and answers in 10 ms.
- `B` starts at 10 ms. `C` is optional, so the reserve is only 20 ms. `B` gets min(200 − 10 − 20, 110) = 110 ms and answers in 105 ms. With the fixed split, `B` would time out here.
- `C` starts at 115 ms and gets min(200 − 115 − 20, 60) = 60 ms. It answers in 25 ms, and our service responds at 160 ms.

![Same latencies: a timeout from the deadline lets B succeed](https://github.com/bacebu4/blog/blob/master/cdn/deadlines-2-fixed-vs-deadline.svg?raw=true)

The caps of `A`, `B` and `C` add up to 220 ms, and our own work needs 20 ms more. A fixed split cannot give these timeouts, because its shares must add up to 200 ms or less. The formula can use these caps, because a call gets its full cap only if enough time is left. When the earlier calls are slow, the later calls get shorter timeouts.

For example, if `A` answers in 48 ms and `B` in 108 ms, `C` starts at 156 ms and gets min(200 − 156 − 20, 60) = 24 ms. That is less than `C`'s minimum timeout of 25 ms, so our service skips `C` and responds at 176 ms.

![Slow A and B: with C, the response would come after the deadline, so C is skipped](https://github.com/bacebu4/blog/blob/master/cdn/deadlines-3-slow-chain.svg?raw=true)

## Retry and hedge within the deadline

**Retries.** Before each retry, compute the call timeout again and compare it with the minimum timeout. No retry runs after the deadline.

**Hedged requests.** For a slow call, a retry starts only when the call timeout has passed, and by then little time is left. A **hedged request** does not wait for the timeout. If the original call has waited longer than the dependency's p95 latency, send a second copy with the call timeout computed from the time left. Use whichever answer arrives first, and cancel the other call. This adds about 5% more requests (see [The Tail at Scale](https://cacm.acm.org/research/the-tail-at-scale/)).

![A slow call to B: retry vs hedged request](https://github.com/bacebu4/blog/blob/master/cdn/deadlines-4-hedged.svg?raw=true)
