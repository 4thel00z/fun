//! JSC bridge for `fun.http.Method`. Keeps `src/http_types/` free of JSC types.

extern "c" fn Fun__HTTPMethod__toJS(method: Method, globalObject: *jsc.JSGlobalObject) jsc.JSValue;

pub const toJS = Fun__HTTPMethod__toJS;

const Method = @import("../http_types/Method.zig").Method;

const fun = @import("fun");
const jsc = fun.jsc;
