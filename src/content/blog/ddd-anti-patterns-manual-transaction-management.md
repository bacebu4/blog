---
title: "DDD Anti-patterns: Manual Transaction Management"
author: Vasilii Krasikov
pubDatetime: 2024-12-01T13:34:11.135Z
postSlug: ddd-anti-patterns-manual-transaction-management
featured: true
draft: false
tags:
  - ddd-anti-patterns
ogImage: https://cdn.jsdelivr.net/gh/bacebu4/blog/cdn/ddd-anti-patterns-manual-transaction-management.png
description: "Using manual transaction management in service layer"
---

Lately I've been reading the "Unit Testing" book from Vladimir Khorikov and have encountered the following misconception in which some people tend to believe:

> In domain-driven design, there’s a guideline saying that you shouldn’t modify more than one aggregate per business operation. [...] **The guideline is only applicable to systems that work with document databases**, though, where each document corresponds to one aggregate.

Let’s explore why this isn’t entirely true and how to address the issue regardless of the type of database you’re using—be it document, relational, or otherwise.

I’ll follow a general pattern to describe the solutions.

## Intent

You want to modify two entities within a single business operation.

## Problem

Imagine you’re changing a user's email. Your code includes two classes: `User` and `Company`.

You also have a rule: the `Company` must track a counter representing the number of `Users` with a company _email domain_.

## (Anti-)Solution

Wrap the updates for both entities into one transaction in the service layer:

```ts
class ChangeUserEmailService {
  public constructor() {
    private readonly database: Database,
    private readonly userRepository: UserRepository,
    private readonly companyRepository: CompanyRepository,
  }

  public async execute(userId: string, companyId: string, newEmail: string) {
    const user = await this.userRepository.getByUserId(userId);
    const company = await this.companyRepository.getByCompanyId(companyId);

    // Passing `company` instance to user to update the company's counter
    user.changeEmail(newEmail, company);

    await this.database.transaction(connection => {
      const userRepository = new UserRepository(connection);
      const companyRepository = new CompanyRepository(connection);

      // Both `.save()` operations are executed within one transaction
      await userRepository.save(user);
      await companyRepository.save(company);
    })
  }
}
```

## Problems

The guideline in DDD that suggests avoiding modification of more than one aggregate per business operation **is not limited to document databases**. Ignoring this rule introduces strong coupling between two separate aggregates, violating a fundamental principle of tactical DDD patterns.

## Solution

Here are two general approaches to solving the problem described above:

### 1. Merging Aggregates

Combine the `User` and `Company` into a single aggregate, leaving only one aggregate in the system. This allows you to manage transactions entirely within the `CompanyRepository` class. The transaction then becomes an **implementation detail** of `CompanyRepository`.

This approach may not be efficient in this specific case but could work well in other scenarios.

After merging aggregates, the service code would look like this:

```ts
const company = await this.companyRepository.getByCompanyId(companyId);

company.changeEmail(newEmail, userId);

await companyRepository.save(company);
```

> **Note:** You can use `AsyncLocalStorage` in Node.js to manage transactions. However, this doesn’t eliminate the coupling; it merely **hides** it using platform-specific instrumentation. The coupling remains present at runtime.

### 2. Creating Eventual Consistency

Split the overloaded business operation into two distinct operations. Use the "change user email" operation to publish [domain events](https://martinfowler.com/eaaDev/DomainEvent.html) (potentially leveraging the [outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)). Then, trigger a second operation in response to the `UserEmailChanged` event.

The code might look something like this:

```ts
// ChangeUserEmailService.ts
const user = await this.userRepository.getByUserId(userId);

user.changeEmail(newEmail);

await userRepository.save(user);
```

```ts
// UpdateCompanyCounter.ts
const company = await this.companyRepository.getByCompanyId(companyId);

company.userEmailChanged(oldEmail, newEmail);

await companyRepository.save(company);
```

## Why It’s Important

Aggregates were designed to protect invariants. Ignoring the core principles of aggregates increases the complexity of already challenging business logic by introducing non-business concerns, such as manual transaction management.

## When to Break the Rules

In the real world, sometimes breaking these rules is unavoidable due to changing requirements or the impracticality of implementing a "perfect" solution.

However, such deviations should always be treated as **technical debt** and addressed later.

## Conclusion

Transactions are just an implementation detail. If your service code handles transactions directly, it’s a sign that your layers are improperly designed.

This implementation detail should be abstracted behind repositories to avoid unnecessary coupling.
