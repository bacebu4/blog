---
title: "(node:61774) ExperimentalWarning: `--experimental-loader` may be removed in the future"
author: Vasilii Krasikov
pubDatetime: 2024-07-29T21:30:19Z
postSlug: experimental-loader-may-be-removed-in-the-future
featured: false
draft: false
tags:
  - docs
ogImage: https://github.com/bacebu4/blog/blob/master/cdn/experimental-loader-may-be-removed-in-the-future?raw=true
description: '...instead use `register()`: --import ''data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./loader.js", pathToFileURL("./"));'''
---

You may have encountered a warning when using the `--loader` Node.js CLI flag, despite the message specifically mentioning `--experimental-loader`. The warning typically appears as follows:

```
(node:82007) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./loader.js", pathToFileURL("./"));'
```

There are several potential solutions to address this issue, depending on your specific use case.

## Table of contents

## Case 1: Own loader

This warning may appear when using your own custom loader, such as the one described in [this](/posts/node-experimental-specifier-resolution-removed) article.

1. Edit your `./loader.js` file (or the file containing your custom loader, regardless of its name):

```ts
// add `register` import
import { isBuiltin, register } from "node:module";
import { dirname } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import resolveCallback from "resolve/async.js";

// add `register call
register("./loader.js", import.meta.url);

const resolveAsync = promisify(resolveCallback);

const baseURL = pathToFileURL(cwd() + "/").href;

export async function resolve(specifier, context, next) {
  // the rest is the same here
  // ...
}
```

2. After modifying your `./loader.js` file, you'll need to change the flags used to start your Node.js application.

```diff
-`node --loader=./loader.js`
+`node --import=./loader.js`
```

**Note:** The fix provided is applicable for ESM (ECMAScript) modules. If you're using CommonJS (CJS) modules, replace the `--import` flag with `--require` and adjust the imports in your loader file accordingly.

## Case 2: Library provided loader

For library-provided loaders, the process is similar. Let's examine an example using the ts-node/esm loader.

1. Create a new file in the root of your project, for example, `loader.js`.

```js
import { register } from "node:module";

register("ts-node/esm", import.meta.url);
```

2. Replace all instances of `--loader ts-node/esm` with `--import ./loader.js` throughout your project.

## Summary

For more detailed information about the `node:module` API, refer to the [official Node.js documentation](https://nodejs.org/api/module.html#enabling). This resource provides comprehensive guidance on implementing and using the new loader system.

Thank you for reading this article!
