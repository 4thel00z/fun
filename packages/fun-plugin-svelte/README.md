<p align="center">
  <a href="https://fun.dev"><img src="https://github.com/user-attachments/assets/50282090-adfd-4ddb-9e27-c30753c6b161" alt="Logo" height=170></a>
</p>
<h1 align="center"><code>fun-plugin-svelte</code></h1>

The official [Svelte](https://svelte.dev/) plugin for [Fun](https://fun.dev/).

## Installation

```sh
$ fun add -D fun-plugin-svelte
```

## Dev Server Usage

`fun-plugin-svelte` integrates with Fun's [Fullstack Dev Server](https://fun.dev/docs/bundler/fullstack), giving you
HMR when developing your Svelte app.

Start by registering it in your [funfig.toml](https://fun.dev/docs/runtime/funfig):

```toml
[serve.static]
plugins = ["fun-plugin-svelte"]
```

Then start your dev server:

```
$ fun index.html
```

See the [example](https://github.com/underdoc-org/fun/tree/main/packages/fun-plugin-svelte/example) for a complete example.

## Bundler Usage

`fun-plugin-svelte` lets you bundle Svelte components with [`Fun.build`](https://fun.dev/docs/bundler).

```ts
// build.ts
// to use: fun run build.ts
import { SveltePlugin } from "fun-plugin-svelte"; // NOTE: not published to npm yet

Fun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "browser",
  sourcemap: true, // sourcemaps not yet supported
  plugins: [
    SveltePlugin({
      development: true, // turn off for prod builds. Defaults to false
    }),
  ],
});
```

## Server-Side Usage

`fun-plugin-svelte` does not yet support server-side imports (e.g. for SSR).
This will be added in the near future.

## Not Yet Supported

Support for these features will be added in the near future

- Server-side imports/rendering
- Source maps
- CSS extensions (e.g. tailwind) in `<style>` blocks
- TypeScript-specific features (e.g. enums and namespaces). If you're using
  TypeScript 5.8, consider enabling [`--erasableSyntaxOnly`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8-beta/#the---erasablesyntaxonly-option)
