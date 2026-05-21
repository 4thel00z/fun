//! `fromJS` for `fun.schema.api.SourceMapMode` — kept out of
//! `options_types/schema.zig` so that file has no `JSGlobalObject`/`JSValue`
//! references.

pub fn sourceMapModeFromJS(global: *fun.jsc.JSGlobalObject, value: fun.jsc.JSValue) fun.JSError!?SourceMapMode {
    if (value.isString()) {
        const str = try value.toSliceOrNull(global);
        defer str.deinit();
        const utf8 = str.slice();
        if (fun.strings.eqlComptime(utf8, "none")) {
            return .none;
        }
        if (fun.strings.eqlComptime(utf8, "inline")) {
            return .@"inline";
        }
        if (fun.strings.eqlComptime(utf8, "external")) {
            return .external;
        }
        if (fun.strings.eqlComptime(utf8, "linked")) {
            return .linked;
        }
    }
    return null;
}

const fun = @import("fun");
const SourceMapMode = fun.schema.api.SourceMapMode;
