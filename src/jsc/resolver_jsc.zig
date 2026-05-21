//! Host fns / C++ exports for `node:module` `_nodeModulePaths`. Extracted from
//! `resolver/resolver.zig` so `resolver/` has no JSC references.

pub fn nodeModulePathsForJS(globalThis: *fun.jsc.JSGlobalObject, callframe: *fun.jsc.CallFrame) fun.JSError!jsc.JSValue {
    fun.jsc.markBinding(@src());
    const argument: fun.jsc.JSValue = callframe.argument(0);

    if (argument == .zero or !argument.isString()) {
        return globalThis.throwInvalidArgumentType("nodeModulePaths", "path", "string");
    }

    const in_str = try argument.toFunString(globalThis);
    defer in_str.deref();
    return nodeModulePathsJSValue(in_str, globalThis, false);
}

pub export fn Resolver__propForRequireMainPaths(globalThis: *fun.jsc.JSGlobalObject) callconv(.c) jsc.JSValue {
    fun.jsc.markBinding(@src());

    const in_str = fun.String.init(".");
    return nodeModulePathsJSValue(in_str, globalThis, false);
}

pub fn nodeModulePathsJSValue(in_str: fun.String, globalObject: *fun.jsc.JSGlobalObject, use_dirname: bool) callconv(.c) fun.jsc.JSValue {
    var arena = std.heap.ArenaAllocator.init(fun.default_allocator);
    defer arena.deinit();
    var stack_fallback_allocator = std.heap.stackFallback(1024, arena.allocator());
    const alloc = stack_fallback_allocator.get();

    var list = std.array_list.Managed(fun.String).init(alloc);
    defer list.deinit();

    const sliced = in_str.toUTF8(fun.default_allocator);
    defer sliced.deinit();
    const base_path = if (use_dirname) std.fs.path.dirname(sliced.slice()) orelse sliced.slice() else sliced.slice();
    const buf = fun.path_buffer_pool.get();
    defer fun.path_buffer_pool.put(buf);

    const full_path = fun.path.joinAbsStringBuf(
        fun.fs.FileSystem.instance.top_level_dir,
        buf,
        &.{base_path},
        .auto,
    );
    const root_index = switch (fun.Environment.os) {
        .windows => fun.path.windowsFilesystemRoot(full_path).len,
        else => 1,
    };
    var root_path: []const u8 = full_path[0..root_index];
    if (full_path.len > root_path.len) {
        var it = std.mem.splitBackwardsScalar(u8, full_path[root_index..], std.fs.path.sep);
        while (it.next()) |part| {
            if (strings.eqlComptime(part, "node_modules"))
                continue;

            list.append(fun.String.createFormat(
                "{s}{s}" ++ std.fs.path.sep_str ++ "node_modules",
                .{
                    root_path,
                    it.buffer[0 .. (if (it.index) |i| i + 1 else 0) + part.len],
                },
            ) catch |err| fun.handleOom(err)) catch |err| fun.handleOom(err);
        }
    }

    while (root_path.len > 0 and fun.path.Platform.auto.isSeparator(root_path[root_path.len - 1])) {
        root_path.len -= 1;
    }

    list.append(fun.String.createFormat(
        "{s}" ++ std.fs.path.sep_str ++ "node_modules",
        .{root_path},
    ) catch |err| fun.handleOom(err)) catch |err| fun.handleOom(err);

    return fun.String.toJSArray(globalObject, list.items) catch .zero;
}

comptime {
    _ = Resolver__propForRequireMainPaths;
    @export(&jsc.toJSHostFn(nodeModulePathsForJS), .{ .name = "Resolver__nodeModulePathsForJS" });
    @export(&nodeModulePathsJSValue, .{ .name = "Resolver__nodeModulePathsJSValue" });
}

const std = @import("std");

const fun = @import("fun");
const jsc = fun.jsc;
const strings = fun.strings;
