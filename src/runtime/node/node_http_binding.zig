pub fn getFunServerAllClosedPromise(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const arguments = callframe.arguments_old(1).slice();
    if (arguments.len < 1) {
        return globalThis.throwNotEnoughArguments("getFunServerAllClosePromise", 1, arguments.len);
    }

    const value = arguments[0];

    inline for ([_]type{
        jsc.API.HTTPServer,
        jsc.API.HTTPSServer,
        jsc.API.DebugHTTPServer,
        jsc.API.DebugHTTPSServer,
    }) |Server| {
        if (value.as(Server)) |server| {
            return server.getAllClosedPromise(globalThis);
        }
    }

    return globalThis.throwInvalidArgumentTypeValue("server", "fun.Server", value);
}

pub fn getMaxHTTPHeaderSize(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    _ = globalThis; // autofix
    _ = callframe; // autofix
    return jsc.JSValue.jsNumber(fun.http.max_http_header_size);
}

pub fn setMaxHTTPHeaderSize(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const arguments = callframe.arguments_old(1).slice();
    if (arguments.len < 1) {
        return globalThis.throwNotEnoughArguments("setMaxHTTPHeaderSize", 1, arguments.len);
    }
    const value = arguments[0];
    const num = try value.coerceToInt64(globalThis);
    if (num <= 0) {
        return globalThis.throwInvalidArgumentTypeValue("maxHeaderSize", "non-negative integer", value);
    }
    fun.http.max_http_header_size = @intCast(num);
    return jsc.JSValue.jsNumber(fun.http.max_http_header_size);
}

const fun = @import("fun");
const jsc = fun.jsc;
