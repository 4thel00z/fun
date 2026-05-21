pub const CookieMap = opaque {
    extern fn CookieMap__write(cookie_map: *CookieMap, global_this: *fun.jsc.JSGlobalObject, kind: fun.uws.ResponseKind, uws_http_response: *anyopaque) void;

    pub fn write(cookie_map: *CookieMap, globalThis: *fun.jsc.JSGlobalObject, kind: fun.uws.ResponseKind, uws_http_response: *anyopaque) fun.JSError!void {
        return fun.jsc.fromJSHostCallGeneric(globalThis, @src(), CookieMap__write, .{ cookie_map, globalThis, kind, uws_http_response });
    }

    extern fn CookieMap__deref(cookie_map: *CookieMap) void;

    pub const deref = CookieMap__deref;

    extern fn CookieMap__ref(cookie_map: *CookieMap) void;

    pub const ref = CookieMap__ref;
};

const fun = @import("fun");
