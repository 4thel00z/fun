//! JSC bridge for `fun.css.Err(T)`. Keeps `src/css/` free of JSC types.

/// `this` is `*const css.Err(T)` for any `T`; only `.kind` is accessed.
pub fn toErrorInstance(this: anytype, globalThis: *fun.jsc.JSGlobalObject) !fun.jsc.JSValue {
    var str = try fun.String.createFormat("{f}", .{this.kind});
    defer str.deref();
    return str.toErrorInstance(globalThis);
}

const fun = @import("fun");
