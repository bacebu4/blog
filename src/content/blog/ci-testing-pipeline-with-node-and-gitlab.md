---
title: "Automated Testing with Node.js and Gitlab"
author: Vasilii Krasikov
pubDatetime: 2025-01-25T14:22:50.577Z
postSlug: automated-testing-with-nodejs-and-gitlab
featured: true
draft: false
tags:
  - testing
description: "Automated Testing with Node.js and Gitlab"
---

Continuous Integration (CI) is an essential part of modern software development. In this guide, we’ll walk through setting up a CI pipeline to test a Node.js application using these tools:

- [Node.js Test Runner](https://nodejs.org/api/test.html#test-runner)
- Gitlab feature like [Test coverage visualization](https://docs.gitlab.com/ee/ci/testing/test_coverage_visualization/index.html) and [Unit test reports](https://docs.gitlab.com/ee/ci/testing/unit_test_reports.html)

![test coverage visualization](https://github.com/bacebu4/blog/blob/master/cdn/test-coverage-visualization.png?raw=true)

# Step 1: Write a Test

Let’s start with the basics. Suppose you already have a test, which might look something like this:

```js
import { describe, it } from "node:test";
import assert from "node:assert";
import { fooOne } from "./foo.js";

describe("fooTest", () => {
  it("returns result", () => {
    const result = fooOne(12);
    assert.strictEqual(result, 14);
  });

  it("handles when x equals to 2", () => {
    const result = fooOne(2);
    assert.strictEqual(result, 3);
  });
});
```

Notice that we’re using the `describe` and `it` methods from the `node:test` module to define our test cases.

# Step 2: Install Dependencies

To enable [Test coverage visualization](https://docs.gitlab.com/ee/ci/testing/test_coverage_visualization/index.html), we need to add the [cobertura](https://www.npmjs.com/package/cobertura) library as a development dependency:

```sh
npm i -D cobertura
```

# Step 3: Define Your Test Script

To keep things clean and manageable, I recommend creating a separate script file for running your tests. This way, you avoid having a long and cluttered CLI command:

```sh
mkdir scripts
touch scripts/test.sh
chmod +x scripts/test.sh
```

Here’s an example test script:

```sh
// scripts/test.sh
#!/bin/sh
node \
  --test \
  --experimental-test-coverage  \
  --test-reporter=junit --test-reporter-destination=rspec.xml \
  --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=cobertura --test-reporter-destination=cobertura.xml
```

## Additional Flags

Depending on your setup, you might need these flags when running your tests:

- `--import ./loader.js` – if you’re using custom loaders, like the one in [this article](https://www.bacebu4.com/posts/experimental-loader-may-be-removed-in-the-future).
- `--env-file` – for providing environment variables.
- `--enable-source-maps` – if you have source maps from TypeScript files. Make sure to set `compilerOptions.inlineSourceMap` to `true` in your `tsconfig.json`.

## Example for TypeScript Projects

If you’re using TypeScript, here’s an updated script:

```sh
// scripts/test.sh
#!/bin/sh

tsc --build . && \

node \
  --test \
  --enable-source-maps \
  --experimental-test-coverage  \
  --test-reporter=junit --test-reporter-destination=rspec.xml \
  --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=cobertura --test-reporter-destination=cobertura.xml \
  './build/**/*.e2e.js'
```

## Run and Verify

You can now test if the script works correctly:

```sh
./scripts/test.sh
```

After running the script, you should see the generated files `rspec.xml` and `cobertura.xml` in your project directory.

## Add the Test Script to `package.json`

To stick with common practices, include the test script in your `package.json` file:

```json
{
  "scripts": {
    "test": "./scripts/test.sh"
  }
}
```

This makes it easier to run your tests with a simple `npm test` command while keeping your workflow standardized.

# Step 4: Add a New Job to `.gitlab-ci.yml`

The final step is to define a new job in your `.gitlab-ci.yml` file:

```yml
stages:
  - test

test:
  stage: test
  image: node:22-alpine
  artifacts:
    when: always
    paths:
      - rspec.xml
    reports:
      junit: rspec.xml
      coverage_report:
        coverage_format: cobertura
        path: ./cobertura.xml
  script:
    - npm ci
    - npm run test
  coverage: '/all files[^|]*\|[^|]*\s+([\d\.]+)/'
```

# Summary

Overall, your Merge Request will look something like [this example](https://gitlab.com/bacebu4/cobertura-test/-/merge_requests/2). You’ll see test reports, coverage visualization, and other key details directly in the GitLab UI, making it easier to track the health of your codebase.

![test coverage visualization](https://github.com/bacebu4/blog/blob/master/cdn/test-coverage-visualization.png?raw=true)

![test coverage report](https://github.com/bacebu4/blog/blob/master/cdn/test-coverage-report.png?raw=true)

![test coverage number](https://github.com/bacebu4/blog/blob/master/cdn/test-coverage-number.png?raw=true)
