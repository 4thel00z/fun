//! JSC bridges for `fun.ComptimeStringMap(V)`. The generic map type stays in
//! `collections/`; only the `JSValue → V` lookup helpers live here.

/// `Map` is the `ComptimeStringMap(V, ...)` instantiation; `Map.Value` is the value type.
pub fn fromJS(comptime Map: type, globalThis: *jsc.JSGlobalObject, input: jsc.JSValue) fun.JSError!?Map.Value {
    const str = try fun.String.fromJS(input, globalThis);
    fun.assert(str.tag != .Dead);
    defer str.deref();
    return Map.getWithEql(str, fun.String.eqlComptime);
}

pub fn fromJSCaseInsensitive(comptime Map: type, globalThis: *jsc.JSGlobalObject, input: jsc.JSValue) fun.JSError!?Map.Value {
    const str = try fun.String.fromJS(input, globalThis);
    fun.assert(str.tag != .Dead);
    defer str.deref();
    return str.inMapCaseInsensitive(Map);
}

const fun = @import("fun");
const jsc = fun.jsc;
