---
title: "Data Source Architectural Patterns Categorized"
author: Vasilii Krasikov
pubDatetime: 2025-03-05T10:15:11.135Z
postSlug: data-source-architectural-patterns-categorized
featured: false
tags:
  - data access
draft: false
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/data-source-architectural-patterns-categorized.png?raw=true
description: "Easy to follow categorization of Data Source Architectural Patterns"
---

Have you ever encountered the following Data Source Architectural Patterns?

- [Table Data Gateway](https://www.martinfowler.com/eaaCatalog/tableDataGateway.html)
- [Row Data Gateway](https://martinfowler.com/eaaCatalog/rowDataGateway.html)
- [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
- [Active Record](https://www.martinfowler.com/eaaCatalog/activeRecord.html)

I’ve always struggled to remember the correct names of these patterns and understand how they differ from one another. After some thought, I realized that they actually differ in two main ways:

- Data source access
- Domain logic

Basically, we can position these patterns on the X and Y axes like this:

![data source architectural patterns categorized graph](https://github.com/bacebu4/blog/blob/master/cdn/data-source-architectural-patterns-categorized-graph.png?raw=true)

# 1. Table Data Gateway

The objects returned:

- Don’t have access to the data source
- Don’t contain domain logic

The object with data source access is the Table Data Gateway, which handles all entities in the data source.

Example:

```ts
class ExampleService {
  public constructor(private readonly userGateway: UserGateway) {}

  public async execute(userId: string, updatedName: string) {
    // Business logic goes here...

    await this.userGateway.updateName(userId, updatedName);
  }
}
```

> Sometimes, the `UserGateway` is referred to as `UserRepository`. The name may vary, but the intent remains the same.

# 2. Row Data Gateway

The objects returned:

- Have access to the data source
- Don’t contain domain logic

The objects returned from the Row Data Gateway have data source access and handle a single entity.

Although I mention that the objects returned don’t contain any domain logic, you might encounter exceptions to this. However, I wouldn’t recommend taking that route, as it mixes responsibilities: domain logic and persistence.

Example:

```ts
class ExampleService {
  public constructor(private readonly userFinder: UserFinder) {}

  public async execute(userId: string, updatedName: string) {
    const user = await this.userFinder.findById(userId);

    // Business logic goes here...

    // `.updateName()` should ideally contain no business logic
    await user.updateName(updatedName);
  }
}
```

# 3. Data Mapper

The objects returned:

- Don’t have access to the data source
- Contain domain logic

The object with data source access is the Data Mapper, which handles all entities in the data source. Often, the Data Mapper class is referred to as a Repository.

Example:

```ts
class ExampleService {
  public constructor(private readonly userRepository: UserRepository) {}

  public async execute(userId: string, updatedName: string) {
    const user = await this.userRepository.findById(userId);
    // `.updateName()` contains some business logic
    user.updateName(updatedName);
    await this.userRepository.save(user);
  }
}
```

# 4. Active Record

The objects returned:

- Have access to the data source
- Contain domain logic

Surprisingly, Active Records are often returned from objects called Repositories, though sometimes they may be referred to as Factories as well. For clarity, let’s stick with the name "Factory."

Example:

```ts
class ExampleService {
  public constructor(private readonly userFactory: UserFactory) {}

  public async execute(userId: string, updatedName: string) {
    const user = await this.userFactory.create(userId);
    // `.updateName()` contains some business logic
    user.updateName(updatedName);
    await user.save();
  }
}
```

# What to choose?

I would certainly _stay away_ from **Row Data Gateway**, as I don’t see the benefit of spreading the responsibility for retrieving and persisting objects across two classes (e.g., `UserFinder` and `User` in the example). The same goes for **Active Record**, though it might be a good fit if your project is structured accordingly and you get Active Record objects out of the box from your ORM library (e.g., TypeORM).

Typically, I lean towards using either **Table Data Gateway** or **Data Mapper**. Table Data Gateway is a perfect fit for projects with minimal domain logic. Data Mapper, on the other hand, aligns well with DDD tactical patterns and is better suited for projects with a rich domain model.
