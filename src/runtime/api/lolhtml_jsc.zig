//! JSC bridge for lol-html `HTMLString`. Keeps `src/lolhtml_sys/` free of JSC types.

pub fn htmlStringToJS(this: HTMLString, globalThis: *fun.jsc.JSGlobalObject) fun.JSError!fun.jsc.JSValue {
    var str = this.toString();
    defer str.deref();
    return try str.toJS(globalThis);
}

const fun = @import("fun");
const HTMLString = fun.LOLHTML.HTMLString;
