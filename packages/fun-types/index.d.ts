// Project: https://github.com/underdoc-org/fun
// Definitions by: Fun Contributors <https://github.com/underdoc-org/fun/graphs/contributors>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

/// <reference path="./globals.d.ts" />
/// <reference path="./s3.d.ts" />
/// <reference path="./fetch.d.ts" />
/// <reference path="./fun.d.ts" />
/// <reference path="./extensions.d.ts" />
/// <reference path="./devserver.d.ts" />
/// <reference path="./ffi.d.ts" />
/// <reference path="./html-rewriter.d.ts" />
/// <reference path="./jsc.d.ts" />
/// <reference path="./sqlite.d.ts" />
/// <reference path="./test.d.ts" />
/// <reference path="./wasm.d.ts" />
/// <reference path="./overrides.d.ts" />
/// <reference path="./deprecated.d.ts" />
/// <reference path="./redis.d.ts" />
/// <reference path="./shell.d.ts" />
/// <reference path="./serve.d.ts" />
/// <reference path="./sql.d.ts" />
/// <reference path="./security.d.ts" />
/// <reference path="./bundle.d.ts" />

/// <reference path="./fun.ns.d.ts" />

// Must disable this so it doesn't conflict with the DOM onmessage type, but still
// allows us to declare our own globals that Node's types can "see" and not conflict with
declare var onmessage: Fun.__internal.UseLibDomIfAvailable<"onmessage", never>;
