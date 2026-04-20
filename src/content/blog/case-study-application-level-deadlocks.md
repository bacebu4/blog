---
title: "Case Study. Application-Level Deadlocks"
author: Vasilii Krasikov
pubDatetime: 2025-08-09T06:42:33.356Z
postSlug: case-study-application-level-deadlocks
featured: false
tags:
  - case study
draft: false
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/case-study-application-level-deadlocks.png?raw=true
description: "Case study of how I debugged service freezes while querying the database pool"
---

I once faced a mysterious incident where our service suddenly stopped processing tasks from the queue and writing the results to the MySQL database. Restarting the service helped mitigate the problem, but it kept happening again and again at least once a month.

Another piece of evidence was in the metrics: the database connection pool would reach its limit, and no free connections remained available.

After another big incident, I sat down to finally resolve the problem. Through load testing, I finally reproduced the problem and discovered the culprit buried in our codebase:

```js
await pool.transaction(connection => {
  await pool.query('...') // get some additional data from the database outside of the transaction
  await connection.query('...') // do some work within the transaction
})
```

That's when it finally hit me: we had an application-level deadlock. Let me explain how this seemingly innocent code can bring down an entire service.

## Understanding the Deadlock Mechanism

1. We have a pool of connections to the database. When we start a transaction, we remove the acquired connection from the pool. The connection is released back to the pool when the transaction is done.
2. When we call the `.query()` method on the pool, we acquire and remove a connection from the pool as well, but it is released to the pool once the query is executed.

So how do we achieve the deadlock knowing these two facts?

1. Suppose we have a pool with 2 available connections
2. Two **concurrent** processes start a transaction roughly at the same time
3. Each process tries to get one more connection for its `.query()` call and waits indefinitely

But **Step 3** will never come to an end: there are no free connections in the pool, and each process that has already acquired a connection is now waiting for another, creating a deadlock.

![application level deadlock scheme](https://github.com/bacebu4/blog/blob/master/cdn/application-level-deadlocks-1.png?raw=true)

## Fixing The Deadlock

Basically, we have three ways to avoid the problem:

### 1. Reuse the Transaction Connection

Do not call the `.query()` method inside a transaction and reuse the existing connection. If this suffices for your needs – go for that one.

```js
await pool.transaction(connection => {
  await connection.query('...') // get some additional data from the database within the transaction
  await connection.query('...') // do some work within the transaction
})
```

This approach keeps everything within a single connection and maintains full ACID compliance.

### 2. Split Connection Pools

If you need separate connections for performance or architectural reasons, create dedicated pools:

```js
await transactionPool.transaction(connection => {
  await readPool.query('...') // get some additional data from the database outside of the transaction
  await connection.query('...') // do some work within the transaction
})
```

> **Note:** Be sure you understand the implications of doing non-transactional reads within a transaction. The reads won't be ACID-compliant and you may encounter anomalies.

### 3. Restructure Your Operations

Just get rid of additional reads within the transaction if you can:

```js
await pool.query('...') // get some additional data from the database outside of the transaction
await pool.transaction(connection => {
  await connection.query('...') // do some work within the transaction
})
```

## Catching The Problem Early

One of the main reasons the bug went undetected is the absence of load testing practices, especially for mission-critical systems.

I used the k6 load testing framework to reproduce and diagnose the issue:

```js
import { check } from "k6";
import { isStatus } from "../common/isStatus.js";
import { sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "30s", target: 100 }, // traffic ramp-up from 1 to 100 users over 30 seconds
    { duration: "2m", target: 100 }, // stay at 100 users for 2 minutes
    { duration: "30s", target: 0 }, // ramp-down to 0 users
  ],
};

export default function load() {
  const stringifiedBody = JSON.stringify({ foo: "bar" });

  const res = http.post("https://service/operation", stringifiedBody, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "has 201 status code": r => isStatus(r, 201),
  });

  sleep(1);
}
```

## Conclusion

This case study is a reminder that even seemingly harmless code can have a significant impact on system stability.

By implementing proper load testing, monitoring connection pool metrics, and following the solutions outlined above, you can avoid this costly mistake and build more resilient systems. Remember: the best bugs are the ones you never have to debug in production.
