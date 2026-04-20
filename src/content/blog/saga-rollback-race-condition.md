---
title: "When Your Saga Rollback Succeeds and Your Users Lose Money"
author: Vasilii Krasikov
pubDatetime: 2026-04-19T18:03:33.356Z
postSlug: saga-rollback-race-condition
featured: true
tags:
  - distributed systems
draft: false
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/saga-rollback-race-condition.png?raw=true
description: "A race condition between saga rollback and downstream service processing that silently freezes user funds"
---

We had a saga-based payment flow. A user initiates a purchase, we reserve money on their account, proceed with the next steps, and if something fails — we **roll back the reservation**. Standard stuff.

One day, users started reporting that their money was stuck. They couldn't buy anything, couldn't transfer — the funds were just missing. We checked the logs. The rollback had executed. It had _succeeded_. That was the problem.

## The Flow

Here's a simplified version of what we had. The orchestrator calls the reservation service to hold funds on the user's account, then proceeds with the rest of the saga:

1. Call reservation service → reserve money
2. Continue with next saga steps
3. If something fails → rollback the reservation
4. If rollback fails → separate process does continue calling **automatic rollbacks** with exponential backoff until succeeds

When the reservation call returned an expected business error — say, insufficient funds — there was no reservation to rollback. The service explicitly rejected the operation. Clean and simple.

But when the reservation call failed with a technical error — a timeout, a 500, a network hiccup — things went wrong.

## The Race Condition

Here's what was actually happening:

1. Orchestrator sends "reserve money" to the reservation service
2. Reservation service starts processing but is slow (network lag, high load, etc.)
3. Orchestrator hits a timeout and considers the operation failed
4. Orchestrator immediately sends "rollback reservation" to the **same service**
5. The service responds: "nothing to rollback". The service hasn't finished processing the reservation yet
6. Orchestrator marks the rollback as successful
7. The service finishes processing and commits the reservation
8. Money is now frozen with nobody coming to release it

The rollback arrived _before_ the service had finished creating the thing we were trying to undo.

![saga rollback race condition scheme](https://github.com/bacebu4/blog/blob/master/cdn/saga-rollback-race-condition-scheme.png?raw=true)

And unlike most race conditions, this one doesn't produce an error. It produces a successful no-op. The orchestrator thinks everything is clean. No alerts fire. The user notices funds.

## Why This Happens Only After Technical Errors

This distinction turned out to be the key insight.

**Business errors** (like "insufficient funds" or "account blocked") mean the service explicitly rejected the operation. No reservation was created. The service knows its own state and is telling you the truth. You can safely proceed with rolling back any previous saga steps.

**Technical errors** (timeouts, 500s, network failures) mean the orchestrator has no idea what happened. Maybe the reservation failed. Maybe it's still being processed. Maybe it succeeded but the response got lost. The orchestrator is guessing — and if it guesses "let me rollback immediately," it hits the race condition.

The key difference: after a business error, the service _knows_ nothing happened. After a technical error, _nobody_ knows.

## The Fix

The fix is surprisingly simple: **only trigger an immediate rollback after business errors. After technical errors — do nothing.**

```java
if (error.getType().equals("business")) {
  rollback(reservationId); // safe — the service rejected the operation, nothing was created
} else {
  // do nothing, wait until automatic rollback happens, e.g. after 5 minutes
}
```

If the orchestrator gets a timeout or a 500, it doesn't rush to rollback. The reservation has a built-in expiry — an automatic rollbacks with exponential backoff will be happening regardless. Let it do its job.

Why is it safer? We wait long enough to be sure the service has finished its work. Only after that do we try to rollback. The time to wait might be specific to each individual service though.

## The Improvement

The fix above works, but the user's money is frozen until the automatic rollbacks fires. We wanted to do better.

The idea: **attempt a non-persistent rollback after a technical error.** Try to release the money immediately — but if the service responds "nothing to rollback," don't trust that answer and **don't mark that operation had a successful rollback**.

```java
if (error.getType().equals("business")) {
  rollback(reservationId); // safe — the service rejected the operation
} else {
  tryRollback(reservationId); // non-persistent rollback, will not affect automatic rollback mechanism
}
```

This gives you the best of both worlds. If the reservation was never created, the rollback succeeds as a genuine no-op and the retry is harmless. If the reservation is still in flight, the immediate rollback fails silently — but the scheduled retry catches it once the reservation has landed.

The key difference from our original bug: we no longer treat "nothing to rollback" as a final answer after a technical error. It's a tentative answer that needs verification.

## The Real Fix

There's actually a cleaner approach: retry the forward operation until you stop getting technical errors, then rollback from a known state.

Forward operations always converge. You retry, and eventually you get either a clear success or a clear business rejection. Both are definitive. Rollbacks after technical errors can't converge. "Nothing to rollback" is ambiguous — it could mean the reservation was never created, or it hasn't been committed yet. You can't tell the difference.

So instead of guessing what to rollback, eliminate the guessing. Retry the reservation call (with an idempotency key) until the service gives you a definitive answer. Then rollback from certainty.

![saga rollback race condition scheme fix](https://github.com/bacebu4/blog/blob/master/cdn/saga-rollback-race-condition-scheme-2.png?raw=true)

## Conclusion

If you're building sagas that involve money reservation or any kind of resource locking — never rollback from an unknown state. After a technical error, the state is unknown. Get to a known state first, then compensate:

- Business errors → state is known. Rollback immediately
- Technical errors → state is unknown. Retry the forward operation until you get a definitive answer, then rollback from there

The standard advice of "make compensations idempotent and retryable" is necessary but not sufficient. Idempotency makes your retries safe. Retryability means you'll eventually converge. But neither solves timing — and if the only retry you ever make is a no-op against a reservation that doesn't exist yet, you'll converge on the wrong state.
