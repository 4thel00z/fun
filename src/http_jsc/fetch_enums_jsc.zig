//! `toJS` bridges for the small `http_types/Fetch*` enums. The enum types
//! themselves stay in `http_types/`; only the JSC extern + wrapper live here
//! so `http_types/` has no `JSValue`/`JSGlobalObject` references.

extern "c" fn Fun__FetchRedirect__toJS(v: u8, global: *jsc.JSGlobalObject) jsc.JSValue;
pub fn fetchRedirectToJS(this: fun.http.FetchRedirect, global: *jsc.JSGlobalObject) jsc.JSValue {
    return Fun__FetchRedirect__toJS(@intFromEnum(this), global);
}

extern "c" fn Fun__FetchRequestMode__toJS(v: u8, global: *jsc.JSGlobalObject) jsc.JSValue;
pub fn fetchRequestModeToJS(this: fun.http.FetchRequestMode, global: *jsc.JSGlobalObject) jsc.JSValue {
    return Fun__FetchRequestMode__toJS(@intFromEnum(this), global);
}

extern "c" fn Fun__FetchCacheMode__toJS(v: u8, global: *jsc.JSGlobalObject) jsc.JSValue;
pub fn fetchCacheModeToJS(this: fun.http.FetchCacheMode, global: *jsc.JSGlobalObject) jsc.JSValue {
    return Fun__FetchCacheMode__toJS(@intFromEnum(this), global);
}

const fun = @import("fun");
const jsc = fun.jsc;
