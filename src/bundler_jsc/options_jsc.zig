//! `fromJS` bridges for `fun.options.{Target,Format,Loader}` and `CompileTarget`.
//! Keeps `src/bundler/` free of `JSValue`/`JSGlobalObject` references.

pub fn targetFromJS(global: *jsc.JSGlobalObject, value: jsc.JSValue) fun.JSError!?options.Target {
    if (!value.isString()) {
        return global.throwInvalidArguments("target must be a string", .{});
    }
    return options.Target.Map.fromJS(global, value);
}

pub fn formatFromJS(global: *jsc.JSGlobalObject, format: jsc.JSValue) fun.JSError!?options.Format {
    if (format.isUndefinedOrNull()) return null;

    if (!format.isString()) {
        return global.throwInvalidArguments("format must be a string", .{});
    }

    return try options.Format.Map.fromJS(global, format) orelse {
        return global.throwInvalidArguments("Invalid format - must be esm, cjs, or iife", .{});
    };
}

pub fn loaderFromJS(global: *jsc.JSGlobalObject, loader: jsc.JSValue) fun.JSError!?options.Loader {
    if (loader.isUndefinedOrNull()) return null;

    if (!loader.isString()) {
        return global.throwInvalidArguments("loader must be a string", .{});
    }

    var zig_str = jsc.ZigString.init("");
    try loader.toZigString(&zig_str, global);
    if (zig_str.len == 0) return null;

    const slice = zig_str.toSlice(fun.default_allocator);
    defer slice.deinit();

    return options.Loader.fromString(slice.slice()) orelse {
        return global.throwInvalidArguments("invalid loader - must be js, jsx, tsx, ts, css, file, toml, yaml, wasm, funsh, json, or md", .{});
    };
}

// ── CompileTarget ──────────────────────────────────────────────────────────
pub fn compileTargetFromJS(global: *jsc.JSGlobalObject, value: jsc.JSValue) fun.JSError!CompileTarget {
    const slice = try value.toSlice(global, fun.default_allocator);
    defer slice.deinit();
    if (!strings.hasPrefixComptime(slice.slice(), "fun-")) {
        return global.throwInvalidArguments("Expected compile target to start with 'fun-', got {s}", .{slice.slice()});
    }

    return compileTargetFromSlice(global, slice.slice());
}

pub fn compileTargetFromSlice(global: *jsc.JSGlobalObject, slice_with_fun_prefix: []const u8) fun.JSError!CompileTarget {
    const slice = slice_with_fun_prefix["fun-".len..];
    const target_parsed = CompileTarget.tryFrom(slice) catch {
        return global.throwInvalidArguments("Unknown compile target: {s}", .{slice_with_fun_prefix});
    };
    if (!target_parsed.isSupported()) {
        return global.throwInvalidArguments("Unsupported compile target: {s}", .{slice_with_fun_prefix});
    }

    return target_parsed;
}

const CompileTarget = @import("../options_types/CompileTarget.zig");

const fun = @import("fun");
const jsc = fun.jsc;
const options = fun.options;
const strings = fun.strings;
