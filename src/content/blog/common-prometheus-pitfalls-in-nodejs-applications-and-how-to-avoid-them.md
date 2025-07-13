---
title: "Common Prometheus Pitfalls in Node.js Applications and How to Avoid Them"
author: Vasilii Krasikov
pubDatetime: 2025-07-13T15:35:24.239Z
postSlug: common-prometheus-pitfalls-in-nodejs-applications-and-how-to-avoid-them
featured: false
draft: false
tags:
  - nodejs
  - monitoring
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/common-prometheus-pitfalls-in-nodejs-applications-and-how-to-avoid-them.png?raw=true
description: "Avoid Prometheus pitfalls in Node.js with this guide on monitoring Event Loop Utilization, managing metric cardinality, and handling gauge errors."
---

Over the course of my career, I've stumbled upon plenty of Prometheus pitfalls that hurt my application performance and led to unexpected behaviors. From increased event loop lag to missing metrics in Grafana dashboards and difficulties in understanding when to scale.

In this article, I’ll share three pitfalls when using the [prom-client](https://www.npmjs.com/package/prom-client) library in Node.js applications, along with solutions to address them.

## 1. Overlooking Event Loop Utilization (ELU) Metrics

Remember [four golden signals](https://sre.google/sre-book/monitoring-distributed-systems/#xref_monitoring_golden-signals) of monitoring? It's latency, traffic, errors and **saturation**.

> **Saturation**. How "full" your service is. A measure of your system fraction, emphasizing the resources that are most constrained (e.g., in a memory-constrained system, show memory; in an I/O-constrained system, show I/O).

For Node.js applications, **Event Loop Utilization (ELU)** is a key saturation metric. Event loop utilization represents the percentage of time the event loop has spent outside the event loop's event provider. An ELU of 100% means that the application is executing only synchronous code and unable to handle additional load. You can find more details in the [Node.js documentation](https://nodejs.org/api/perf_hooks.html#performanceeventlooputilizationutilization1-utilization2).

Even though it's one of the most important metrics your Node.js application should export, it's not included in `prom-client` default metrics list. There has been a [PR for adding the metric as a default one](https://github.com/siimon/prom-client/pull/518), but it's still not getting enough attention. To address this, you can implement a custom ELU metric as follows:

```ts
import prometheus from "prom-client";
import { performance } from "node:perf_hooks";

let elu1 = performance.eventLoopUtilization();

const metric = new prometheus.Summary({
  name: "event_loop_utilization",
  help: "ratio of time the event loop is not idling in the event provider to the total time the event loop is running",
  maxAgeSeconds: 60,
  ageBuckets: 5,
});

setInterval(() => {
  const elu2 = performance.eventLoopUtilization();
  metric.observe(performance.eventLoopUtilization(elu2, elu1).utilization);
  elu1 = elu2;
}, 500).unref();
```

You can choose your own interval time depending on how granular you want to track you ELU. To visualize this metric in Grafana, use the following PromQL query:

```
event_loop_utilization{exported_service="$service", quantile="0.9"}
```

## 2. Ignoring Metric Cardinality

What is Cardinality?

> Cardinality is how many unique values of something there are.

It can significantly impact Prometheus server performance and your application too. As explained in this [article by Robust Perception](https://www.robustperception.io/cardinality-is-key/), high cardinality can overwhelm Prometheus, leading to slower queries and increased resource usage.

But how to calculate it?

Assume you have a histogram with 12 buckets. Then you add 2 labels:

- `method` (with values `get-user`, `update-user`, `delete-user`)
- `responseCode` (with values `success`, `failed`).

The resulting cardinality is:

```
12 buckets × 3 methods × 2 response codes = 72 time series
```

This level of cardinality is manageable.

However, issues arise when you include labels with high variability, such as `userAgent` or `ipCountry`. These labels can generate millions of unique combinations, which Prometheus is not designed to handle efficiently.

High cardinality also increases the time required for metrics scraping, which can increase event loop lag in your Node.js application. For example, [this issue](https://github.com/siimon/prom-client/issues/543) highlights how high cardinality impacted metric collection performance.

### Best Practices

- **Limit Label Values.** Avoid labels with unbounded or highly variable values (e.g., user IDs, IP addresses).
- **Monitor Cardinality.** Regularly check the cardinality to ensure it remains manageable.
- **Use Appropriate Tools.** For high-cardinality data, consider alternative systems like log aggregators or databases designed for such use cases.

Keep your cardinality low to improve performance of your Prometheus server (and your application as well).

## 3. Ignoring Error and Timeout Handling in Gauges

Let's assume you want to track the number of users in metrics. Consider this flawed example which can lead to missing metrics in Grafana dashboards:

```typescript
new prometheus.Gauge({
  name: "user_total",
  help: "Total number of users",
  async collect() {
    const total = await userRepo.count();
    this.set(total.count);
  },
});
```

Problems with this approach:

- **Error Handling.** If `userRepo.count()` throws an error, the entire metric collection process fails, resulting in no metrics being exported.
- **Timeouts.** If `userRepo.count()` takes too long (e.g., 10 seconds), it delays the collection of all metrics, causing gaps in your Grafana dashboard.

Let's break down the solutions.

### Solution 1: Add Error Handling and Timeouts in `.collect()`

Add error handling and a timeout:

```typescript
import { setTimeout as sleep } from "node:timers/promises";

new prometheus.Gauge({
  name: "user_total",
  help: "Total number of users",
  async collect() {
    try {
      const total = await Promise.race([userRepo.count(), sleep(3_000)]);

      if (total !== undefined) {
        this.set(total.count);
      }
    } catch (e) {
      console.error("Error occurred while setting gauge", e);
    }
  },
});
```

### Approach 2: Decouple Metric Updates from Scraping

Alternatively, update the gauge independently of the scrape interval using a separate interval:

```typescript
import { setTimeout as sleep } from "node:timers/promises";

const userTotalGauge = new prometheus.Gauge({
  name: "user_total",
  help: "Total number of users",
});

setInterval(() => {
  try {
    const total = await Promise.race([userRepo.count(), sleep(3_000)]);

    if (total !== undefined) {
      userTotalGauge.set(total.count);
    }
  } catch (e) {
    console.error("Error occurred while setting gauge", e);
  }
}, 10_000);
```

This approach decouples metric updates from Prometheus scraping, allowing you to control the update frequency (e.g., every 10 seconds) independently of the scrape interval.

## Conclusion

Monitoring Node.js applications with Prometheus requires careful attention to metrics like Event Loop Utilization, cardinality management, and error handling. By implementing the solutions outlined above, you can ensure reliable metrics and improved application performance.
