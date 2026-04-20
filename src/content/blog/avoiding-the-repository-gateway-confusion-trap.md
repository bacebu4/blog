---
title: "Avoiding the Repository-Gateway Confusion Trap"
author: Vasilii Krasikov
pubDatetime: 2025-05-24T10:22:50.577Z
postSlug: avoiding-the-repository-gateway-confusion-trap
featured: false
tags:
  - data access
draft: false
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/avoiding-the-repository-gateway-confusion-trap.png?raw=true
description: "Explore why this confusion happens, its consequences, and how to design clear, maintainable data access layers for each category."
---

In Domain-Driven Design (DDD), the Repository and Gateway patterns are powerful tools for managing data access. However, developers often confuse them. This is especially true in systems handling broad set of data sources:

- API-sourced data
- External Database Data
- Internal View Data
- Domain Data

In this article, we'll explore why this confusion happens, its consequences, and how to design clear, maintainable data access layers for each category.

## The Problem: Confusing Repositories and Gateways

Imagine a class called `UserRepository` that only fetches user data from an external API or runs `SELECT` queries without saving data. Is it a repository? Or is it something else? This confusion comes from naming habits and framework conventions. Calling a class as a repository when it's a gateway (or vice versa) leads to unclear abstractions, which makes the code harder to maintain.

Firstly, let's define the patterns:

- **Repository**. A collection-like interface for managing domain entities (e.g., `User`) in a local database, handling create, read, update, and delete (CRUD) operations.
- **Gateway**. An abstraction for interacting with external systems (e.g., APIs, remote databases), handling protocol-specific details like HTTP requests or SQL connections.

The confusion arises when developers use "repository" for any data-fetching class. Let's explore four common data categories and how to handle them correctly.

## Data Categories and Their Patterns

Below is a summary of data categories, patterns, and naming conventions, with detailed explanations provided in the following sections.

| Data Category          | Pattern            | Naming Convention  |
| ---------------------- | ------------------ | ------------------ |
| API-Sourced Data       | Gateway            | `UserApiGateway`   |
| External Database Data | Gateway            | `UserGateway`      |
| Internal View Data     | Table Data Gateway | `UserQueryService` |
| Domain Data            | Repository         | `UserRepository`   |

The following C4 diagram provides a high-level view of the system, illustrating its structure and interactions from a broader perspective.

![C4 Context Diagram for Data Sources](https://github.com/bacebu4/blog/blob/master/cdn/avoiding-the-repository-gateway-confusion-trap-1.png?raw=true)

> **Note:** Point 4 (Internal Database) is used by both Internal View Data and Domain Data, with different access patterns (`UserQueryService` for queries, `UserRepository` for domain entities).

### 1. API-Sourced Data

**Scenario**: Your application fetches user data from an external IAM service via REST APIs, as shown at _point 1_ and _point 2_ in the C4 diagram.

**Solution**: Use Gateway pattern

**Naming convention**: `UserApiGateway` or `UserGateway`

This scenario is less prone to confusion, as the external nature of APIs naturally aligns with the Gateway pattern.

### 2. External Database Data

**Scenario**: Your system queries a legacy Oracle database for user records, possibly with limited write capabilities, as shown at _point 3_ in the C4 diagram.

**Solution**: Use Gateway pattern

**Naming convention**: `UserGateway`

The presence of SQL code in the class often leads developers to assume it's a repository. But in DDD, calling it a repository would be inappropriate since it's not managing domain entities, unlike repositories. Commonly, this case is confused with the Repository pattern and named `UserRepository`.

### 3. Internal View Data

**Scenario**: Querying user data (e.g., IDs, names, emails, statuses, roles) in a local database for display in an admin panel, with filters for viewing purposes (e.g., by status or role), as shown at _point 4_ in the C4 diagram. The data is read-only for these queries, as modifications are handled elsewhere.

**Solution**: Use neither of those patterns

**Naming convention**: `UserQueryService`

In DDD, repositories focus on domain logic and persistence, not view-optimized queries. This data lacks domain logic, unlike domain data, so it's not a Repository pattern. It's not an external system as well, so it doesn't fit the Gateway pattern. Frameworks like Spring Data or TypeORM often mislead developers into using repositories for such queries, causing confusion.

By definition, this scenario matches the [`Table Data Gateway`](/posts/data-source-architectural-patterns-categorized) pattern, which provides a simple interface for querying a database table. However, naming it `UserTableGateway` could confuse developers, as "gateway" often implies external systems in modern architectures. Instead, we recommend `UserQueryService` to clearly reflect its role as a view-optimized query layer in a DDD context, while still fulfilling the responsibilities of a Table Data Gateway.

### 4. Domain Data

**Scenario**: Your application manages `User` entities (e.g., name, email) with full CRUD operations, acting as an aggregate root in DDD, using the internal database as shown at _point 4_ in the C4 diagram.

**Solution**: Use Repository pattern

**Naming convention**: `UserRepository`

This is the core DDD Repository use case, managing the lifecycle of aggregate roots in a local database.

## Why the Confusion Happens

Confusing repositories and gateways is common due to:

- **Framework Influence**. Frameworks like Spring Data generate query-focused "repositories", encouraging their use for read-only or external data.
- **Shared databases**. In microservices, services may access shared database tables for integration, often encapsulated in misnamed "repositories" instead of gateways.
- **Same data source**. _Point 4_ in the C4 diagram shows the internal database accessed by both `UserQueryService` and `UserRepository`, often leading developers to mislabel both as repositories and blur their distinct roles.

This leads to technical debt, unclear abstractions, and maintenance challenges.

## Conclusion

Confusing repositories and gateways is a common pitfall, but by understanding your data categories you can design clear, maintainable systems. Use repositories for domain data, gateways for external systems, and query services for internal data access. With clear naming and separation of concerns, you'll avoid the trap and build robust designs that stand the test of time.
