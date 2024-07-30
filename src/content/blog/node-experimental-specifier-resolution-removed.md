---
title: Node.js --experimental-specifier-resolution removed
author: Vasilii Krasikov
pubDatetime: 2024-07-30T05:17:19Z
postSlug: node-experimental-specifier-resolution-removed
featured: false
draft: false
tags:
  - docs
ogImage: https://cdn.jsdelivr.net/gh/bacebu4/blog/cdn/node-experimental-specifier-resolution-removed.png
description: Directory import '...' is not supported resolving ES modules imported from ...
---

Since the end of 2023 Node V20 [will become](https://nodejs.dev/en/about/releases/) in Active LTS. After that you may feel tempted to upgrade for the new major release of runtime. And there're chances you will encounter such error

```
Error [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import '...' is not supported resolving ES modules imported from ...
```

## TL;DR

Use [this](https://github.com/nodejs/loaders-test/tree/main/commonjs-extension-resolution-loader) custom loader

**UPD**: you may also want slightly to modify the provided loader to **not** use deprecated `--loader` flag but `--import` flag instead. More information about it [here](/posts/experimental-loader-may-be-removed-in-the-future)

## Table of contents

## Why Did It Happen In The First Place?

Take a look at this pull request. `--experimental-specifier-resolution` and `--es-module-specifier-resolution` simply just got deprecated.

The reason behind it – users can replicate the behavior of these flags on their own.

But let's first figure out more details on occurring error.

## What Does This Error Even Mean?

Pay attention to such imports/exports:

```js
export * from "./http";
```

We're trying to reexport everything from `index.js` _implicitly_. `index.js` isn't mentioned here anywhere, that's what brings trouble. We could simply fix it by adding `/index.js` at then:

```js
export * from "./http/index.js";
```

But it wouldn't help us if the problem code were in library. Then meet the loaders!

## ECMAScript Modules Loaders

According to the loader's Node.js team the loaders are needed to implement use cases that [were not initially in ES Modules](https://github.com/nodejs/loaders#history). Looks like they're talking about our case!

How to accomplish the desired behavior:

1. Head out to [this](https://github.com/nodejs/loaders-test/blob/main/commonjs-extension-resolution-loader/README.md) repo
2. Copy `loader.js` file to root of your newly upgraded project
3. Add additional dependency to you project (`"resolve": "^1.22.1"`)
4. Make sure that dependency is **NOT** in your `devDependencies`
5. Install updated dependencies
6. Add flag to node like that: `node --loader=./loader.js`
7. Don't forget to include this flag to all places where `node` is calling your application (even in Dockerfile)

But why would we copy the source code and haven't installed an appropriate library? First of all, the linked repo doesn't come with any npm package. Some guy [have uploaded](https://www.npmjs.com/package/commonjs-extension-resolution-loader) it to npm anyways, but I don't want to to bring some random dependency into my code. You might have a different opinion though 🤷‍♂️

## Bonus: Working With Such Libraries From TypeScript

If you would like to work with library that is using such loader or previously used deprecated flag you'd need to make some tweaks to your configs

Let's start with `tsconfig.json` (most unrelated settings are omitted):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Node10"
  }
}
```

The biggest key to make it work is to set `moduleResolution` to `Node10`. This way TypeScript will properly parse typings that are being supplied with library.

The second thing to do is you set `type` to `module` inside `package.json` and you good to go.

Thanks for reading!
