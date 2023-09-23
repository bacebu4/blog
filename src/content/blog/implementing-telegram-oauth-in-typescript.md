---
title: Implementing Telegram "OAuth" in TypeScript
author: Vasilii Krasikov
pubDatetime: 2023-09-23T15:17:19Z
postSlug: implementing-telegram-oauth-in-typescript
featured: false
draft: false
tags:
  - guides
ogImage: /assets/implementing-telegram-oauth-in-typescript.png
description: The objective of this guide is to create a custom login button, distinct from the pre-built option provided by the Telegram script
---

The objective of this tutorial is to create a custom login button without, distinct from the pre-built option provided by the [Telegram Login Widget](https://core.telegram.org/widgets/login). Additionally, I encountered challenges while trying to reposition the default button that comes with the script, resulting in a less than optimal Developer Experience (DX). We'll address this issue in this guide.

All code snippets in this guide will be in TypeScript, and I'll be using the [Zod](https://www.npmjs.com/package/zod) validation library.

> It's worth noting that Telegram authentication doesn't follow the traditional OAuth implementation, which is why it's enclosed in quotes in the title.

## Table of contents

## 1. Create a Bot

To begin the process of implementing authorization, it's imperative to create your own bot. It's crucial to name the bot in a way that aligns with your application. This is vital because the bot's name will be visible during the authorization flow, and you definitely don't want to confuse your users with a generic bot image.

Once you've named your bot, you should request a bot token from @BotFather, which will be in the following format:

```
[NUMBER]:[NUMBERS_WITH_LETTERS]
```

The first part of this API Token will be your `bot_id`, a piece of information we'll need later in the process.

## 2. Add Script Tag

You should insert the following script into your `index.html` file, preferably within the `head` section:

```html
<script src="https://telegram.org/js/telegram-widget.js?22"></script>
```

This script will introduce the `Telegram` key into our `window` object.

It's important to note that we're intentionally not including the `async` attribute on the script tag, contrary to what the Telegram documentation suggests. This choice will have significant implications down the road.

Additionally, we are refraining from defining any other attributes mentioned in the documentation. We're doing this because we don't want the default "Login With Telegram" button to be visible; instead, we aim to implement our custom solution.

## 3. Install the Zod Library

You can install the Zod library using your preferred package manager. In this case, we'll use npm:

```bash
npm i zod
```

However, feel free to use any package manager that suits your workflow.

## 4. Define `Telegram` Class

```ts
import { z } from "zod";

const telegramUserSchema = z.object({
  auth_date: z.number(),
  first_name: z.string(),
  hash: z.string(),
  id: z.number(),
  last_name: z.string(),
  photo_url: z.string(),
  username: z.string(),
});

const loginResponseSchema = z.boolean().or(telegramUserSchema);

const loginPropsSchema = z.object({
  bot_id: z.string(),
  request_access: z.boolean(),
});

const clientSchema = z.object({
  Telegram: z.object({
    Login: z.object({
      auth: z
        .function()
        .args(loginPropsSchema, z.function().args(loginResponseSchema)),
    }),
  }),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

class Telegram {
  private client;

  constructor() {
    this.client = clientSchema.parse(window).Telegram;
  }

  public login(
    props: z.infer<typeof loginPropsSchema>
  ): Promise<z.infer<typeof loginResponseSchema>> {
    return new Promise(resolve => {
      if (!this.client) {
        return resolve(false);
      }

      this.client.Login.auth(props, response => resolve(response));
    });
  }
}

export const telegram = new Telegram();
```

In the code snippet above, we've defined the `Telegram` class, which plays a key role in ensuring type safety throughout the integration. Let's break down what's happening here:

- `telegramUserSchema` – This schema represents the object that Telegram will return upon a successful login.
- `loginResponseSchema` – It defines the structure of the response you can expect from a login attempt.
- `loginPropsSchema` – This schema specifies the object you need to provide to the Telegram SDK to initiate a login process.
- `clientSchema` – This is where the magic happens. We're creating a type-safe representation of the function call: `window.Telegram.Login.auth()`. It ensures that both the input and output variables are validated.
- `Telegram` – This class acts as the glue that brings all these schemas together.

By establishing these schemas, you can interact with the loaded SDK in a type-safe manner, ensuring input and output variable validation. This enhances the robustness of your integration.

## 5. Use `Telegram` Class

To demonstrate how to use the `Telegram` class, consider the following example:

```ts
const login = async () => {
  const res = await telegram.login({
    bot_id: "YOUR_BOT_ID_HERE",
    request_access: true,
  });

  if (typeof res !== "boolean") {
    // successful login, `res` will be the information on user
  } else {
    console.error("Could not login");
  }
};
```

## 6. Authenticating on Server

To determine if a user has logged in through Telegram, you need the `res` variable obtained from the code snippet provided earlier.

You can pass all the fields to the server using your preferred method, whether it's through a cookie or directly in the request body. Once received, the server can validate this object to establish whether the user has successfully logged in.

The following code snippet demonstrates how to validate the object on the server:

```ts
import crypto from "node:crypto";

export class TelegramAuth {
  private secretKey;

  constructor(botToken: string) {
    this.secretKey = crypto.createHash("sha256").update(botToken).digest();
  }

  public isValid(data: Record<string, string | number>) {
    const authData = { ...data };
    const checkHash = authData.hash;
    delete authData.hash;

    const dataCheckString = Object.entries(authData)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");

    const hash = crypto
      .createHmac("sha256", this.secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (hash !== checkHash) {
      throw new Error("Data is NOT from Telegram");
    }

    if (Date.now() / 1000 - Number(authData.auth_date) > 86400) {
      throw new Error("Outdated auth data");
    }
  }
}
```

> I will not explain the provided code in detail since mostly it was copied from [Telegram gist](https://gist.github.com/anonymous/6516521b1fb3b464534fbc30ea3573c2), but it was in PHP, so I just converted it into TypeScript

The sample usage example, integrating this into your codebase, might look like this (using the `trpc` library):

```ts
const telegramUserSchema = z.object({
  auth_date: z.number(),
  first_name: z.string(),
  hash: z.string(),
  id: z.number(),
  last_name: z.string(),
  photo_url: z.string(),
  username: z.string(),
});

const appRouter = router({
  listMessages: publicProcedure
    .input(
      z.object({
        telegramUser: telegramUserSchema,
      })
    )
    .query(async ({ input }) => {
      telegramAuth.isValid(input.telegramUser);

      // now `input.telegramUser` was validated
      // we can trust the provided information inside

      const result = await repo.get({
        userId: input.telegramUser.id.toString(),
      });

      return result;
    }),
});
```

## Conclusion

If you have any remaining questions or need further assistance, please don't hesitate to reach out to me on [Twitter](http://twitter.com/bacebu4). Your feedback and inquiries are always welcome.

Thank you for reading!
