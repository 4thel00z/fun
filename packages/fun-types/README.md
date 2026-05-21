# TypeScript types for Fun

<p align="center">
  <a href="https://fun.dev"><img src="https://fun.dev/logo@2x.png" alt="Logo"></a>
</p>

These are the type definitions for Fun's JavaScript runtime APIs.

# Installation

Install the `@types/fun` npm package:

```bash
# yarn/npm/pnpm work too
# @types/fun is an ordinary npm package
fun add -D @types/fun
```

That's it! VS Code and TypeScript automatically load `@types/*` packages into your project, so the `Fun` global and all `fun:*` modules should be available immediately.

# Contributing

The `@types/fun` package is a shim that loads `fun-types`. The `fun-types` package lives in the Fun repo under `packages/fun-types`.

To add a new file, add it under `packages/fun-types`. Then add a [triple-slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) pointing to it inside [./index.d.ts](./index.d.ts).

```diff
+ /// <reference path="./newfile.d.ts" />
```

```bash
fun build
```
