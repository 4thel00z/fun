# Browser polyfills for `fun build --target=browser`

When using `fun build --target=browser`, if you attempt to import a Node.js module, Fun will load a polyfill for that module in an attempt to let your code still work even though it's not running in Node.js or a server.

For example, if you import `zlib`, the `node-fallbacks/zlib.js` file will be loaded.

## Not used by Fun's runtime

These files are _not_ used by Fun's runtime. They are only used for the `fun build --target=browser` command.

If you're interested in contributing to Fun's Node.js compatibility, please see the [`src/js` directory](https://github.com/underdoc-org/fun/tree/main/src/js).
