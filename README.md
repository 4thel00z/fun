<p align="center">
  <img src="./docs/logo/logo.jpg" alt="Fun" height="220">
</p>

<h1 align="center">Fun</h1>

<p align="center">An all-in-one JavaScript & TypeScript runtime, bundler, test runner, and package manager — written in Zig.</p>

## What is Fun?

Fun is an all-in-one toolkit for JavaScript and TypeScript apps. It ships as a single executable called `fun`.

At its core is the _Fun runtime_, a fast JavaScript runtime designed as **a drop-in replacement for Node.js**. It's written in Zig and powered by JavaScriptCore under the hood, dramatically reducing startup times and memory usage.

```bash
fun run index.tsx             # TS and JSX supported out-of-the-box
```

The `fun` command-line tool also implements a test runner, script runner, and Node.js-compatible package manager. Instead of 1,000 node_modules for development, you only need `fun`. Fun's built-in tools are significantly faster than existing options and usable in existing Node.js projects with little to no changes.

```bash
fun test                      # run tests
fun run start                 # run the `start` script in `package.json`
fun install <pkg>             # install a package
funx cowsay 'Hello, world!'   # execute a package
```

## Install

Fun supports Linux (x64 & arm64), macOS (x64 & Apple Silicon), and Windows (x64 & arm64).

> **Linux users** — Kernel version 5.6 or higher is strongly recommended, but the minimum is 5.1.

Installation instructions and prebuilt binaries are coming soon. For now, build from source:

```sh
fun bd                        # produces ./build/debug/fun-debug
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full build setup.

## Architecture

Fun is written primarily in **Zig**, with C++ used only where it's required (JavaScriptCore bindings, Web APIs that touch WebKit internals). The runtime, bundler, package manager, test runner, and shell are all native Zig code.

- `src/` — runtime, parser, transpiler, bundler, resolver, package manager, shell, SQL, HTTP
- `src/js/` — built-in JavaScript modules (`node:*`, `fun:*`)
- `src/jsc/bindings/` — C++ JavaScriptCore bindings (auto-generated where possible)
- `vendor/` — vendored C/C++ dependencies (BoringSSL, WebKit, mimalloc, libuv, …)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for build instructions, code organization, and PR guidelines.

## License

See [LICENSE.md](./LICENSE.md).
