// JSC test harness polyfills for Fun
// These globals are used by JSC stress tests but are not available in Fun.

// noInline: hints JSC to not inline the function. No-op in Fun.
globalThis.noInline = require("fun:jsc").noInline;

// Debug builds (incl. `fun bd`) run JIT code far slower; reduce loop counts
// there so fixtures that iterate to trigger tier-up don't time out. Release
// (and release-ASAN) keep the full count to exercise OSR / tier-up paths.
let loopScale = Fun.version.includes("debug") ? 10 : 1;

// testLoopCount: iteration count to trigger JIT tier-up (Baseline -> DFG -> FTL).
globalThis.testLoopCount = 10000 / loopScale;

// wasmTestLoopCount: iteration count to trigger Wasm tier-up (IPInt -> BBQ -> OMG).
globalThis.wasmTestLoopCount = 10000 / loopScale;

// print: JSC's output function, mapped to console.log.
globalThis.print = console.log;

// Wasm test polyfills
globalThis.callerIsBBQOrOMGCompiled = function () {
  return 1;
};
if (!globalThis.$) globalThis.$ = {};
if (!$.agent) $.agent = { report: function () {} };
