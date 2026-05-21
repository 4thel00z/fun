//! JSC bridge for `fun.Semver.String`. Keeps `src/semver/` free of JSC types.

pub fn toJS(this: *const String, buffer: []const u8, globalThis: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    return fun.String.createUTF8ForJS(globalThis, this.slice(buffer));
}

const fun = @import("fun");
const jsc = fun.jsc;
const String = fun.Semver.String;
