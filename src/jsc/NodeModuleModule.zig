export const NodeModuleModule__findPath = jsc.host_fn.wrap3(findPath);

// https://github.com/nodejs/node/blob/40ef9d541ed79470977f90eb445c291b95ab75a0/lib/internal/modules/cjs/loader.js#L666
fn findPath(
    global: *JSGlobalObject,
    request_fun_str: fun.String,
    paths_maybe: ?*jsc.JSArray,
) fun.JSError!JSValue {
    var stack_buf = std.heap.stackFallback(8192, fun.default_allocator);
    const alloc = stack_buf.get();

    const request_slice = request_fun_str.toUTF8(alloc);
    defer request_slice.deinit();
    const request = request_slice.slice();

    const absolute_request = std.fs.path.isAbsolute(request);
    if (!absolute_request and paths_maybe == null) {
        return .false;
    }

    // for each path
    var found = if (paths_maybe) |paths| found: {
        var iter = try paths.iterator(global);
        while (try iter.next()) |path| {
            const cur_path = try fun.String.fromJS(path, global);
            defer cur_path.deref();

            if (findPathInner(request_fun_str, cur_path, global)) |found| {
                break :found found;
            }
        }

        break :found null;
    } else findPathInner(request_fun_str, fun.String.static(""), global);

    if (found) |*str| {
        return str.transferToJS(global);
    }

    return .false;
}

fn findPathInner(
    request: fun.String,
    cur_path: fun.String,
    global: *JSGlobalObject,
) ?fun.String {
    var errorable: ErrorableString = undefined;
    jsc.VirtualMachine.resolveMaybeNeedsTrailingSlash(
        &errorable,
        global,
        request,
        cur_path,
        null,
        false,
        true,
        true,
    ) catch |err| switch (err) {
        error.JSError => {
            global.clearException(); // TODO sus
            return null;
        },
        else => return null,
    };
    return errorable.unwrap() catch null;
}

pub fn _stat(path: []const u8) i32 {
    const exists = fun.sys.existsAtType(.cwd(), path).unwrap() catch
        return -1; // Returns a negative integer for any other kind of strings.
    return switch (exists) {
        .file => 0, // Returns 0 for files.
        .directory => 1, // Returns 1 for directories.
    };
}

pub const CustomLoader = union(enum) {
    loader: fun.options.Loader,
    custom: jsc.Strong,
};

extern fn JSCommonJSExtensions__appendFunction(global: *jsc.JSGlobalObject, value: jsc.JSValue) u32;
extern fn JSCommonJSExtensions__setFunction(global: *jsc.JSGlobalObject, index: u32, value: jsc.JSValue) void;
/// Returns the index of the last value, which must have it's references updated to `index`
extern fn JSCommonJSExtensions__swapRemove(global: *jsc.JSGlobalObject, index: u32) u32;

// Memory management is complicated because JSValues are stored in gc-visitable
// WriteBarriers in C++ but the hash map for extensions is in Zig for flexibility.
fn onRequireExtensionModify(global: *jsc.JSGlobalObject, str: []const u8, loader: fun.schema.api.Loader, value: jsc.JSValue) fun.OOM!void {
    const vm = global.funVM();
    const list = &vm.commonjs_custom_extensions;
    defer vm.transpiler.resolver.opts.extra_cjs_extensions = list.keys();
    const is_built_in = fun.options.defaultLoaders.get(str) != null;

    const gop = try list.getOrPut(fun.default_allocator, str);
    if (!gop.found_existing) {
        gop.key_ptr.* = try fun.default_allocator.dupe(u8, str);
        if (is_built_in) {
            vm.has_mutated_built_in_extensions += 1;
        }

        gop.value_ptr.* = if (loader != ._none)
            .{ .loader = .fromAPI(loader) }
        else
            .{ .custom = .create(value, global) };
    } else {
        if (loader != ._none) {
            switch (gop.value_ptr.*) {
                .loader => {},
                .custom => |*strong| strong.deinit(),
            }
            gop.value_ptr.* = .{ .loader = .fromAPI(loader) };
        } else {
            switch (gop.value_ptr.*) {
                .loader => gop.value_ptr.* = .{ .custom = .create(value, global) },
                .custom => |*strong| strong.set(global, value),
            }
        }
    }
}

fn onRequireExtensionModifyNonFunction(global: *JSGlobalObject, str: []const u8) fun.OOM!void {
    const vm = global.funVM();
    const list = &vm.commonjs_custom_extensions;
    defer vm.transpiler.resolver.opts.extra_cjs_extensions = list.keys();
    const is_built_in = fun.options.defaultLoaders.get(str) != null;

    if (list.fetchSwapRemove(str)) |prev| {
        fun.default_allocator.free(prev.key);
        if (is_built_in) {
            vm.has_mutated_built_in_extensions -= 1;
        }
        switch (prev.value) {
            .loader => {},
            .custom => |strong| {
                var mut = strong;
                mut.deinit();
            },
        }
    }
}

pub fn findLongestRegisteredExtension(vm: *jsc.VirtualMachine, filename: []const u8) ?CustomLoader {
    const basename = std.fs.path.basename(filename);
    var next: usize = 0;
    while (fun.strings.indexOfCharPos(basename, '.', next)) |i| {
        next = i + 1;
        if (i == 0) continue;
        const ext = basename[i..];
        if (vm.commonjs_custom_extensions.get(ext)) |value| {
            return value;
        }
    }
    return null;
}

fn onRequireExtensionModifyBinding(
    global: *jsc.JSGlobalObject,
    str: *const fun.String,
    loader: fun.schema.api.Loader,
    value: jsc.JSValue,
) callconv(.c) void {
    var sfa_state = std.heap.stackFallback(8192, fun.default_allocator);
    const alloc = sfa_state.get();
    const str_slice = str.toUTF8(alloc);
    defer str_slice.deinit();
    onRequireExtensionModify(global, str_slice.slice(), loader, value) catch |err| switch (err) {
        error.OutOfMemory => fun.outOfMemory(),
    };
}

fn onRequireExtensionModifyNonFunctionBinding(
    global: *jsc.JSGlobalObject,
    str: *const fun.String,
) callconv(.c) void {
    var sfa_state = std.heap.stackFallback(8192, fun.default_allocator);
    const alloc = sfa_state.get();
    const str_slice = str.toUTF8(alloc);
    defer str_slice.deinit();
    onRequireExtensionModifyNonFunction(global, str_slice.slice()) catch |err| switch (err) {
        error.OutOfMemory => fun.outOfMemory(),
    };
}

comptime {
    @export(&onRequireExtensionModifyBinding, .{ .name = "NodeModuleModule__onRequireExtensionModify" });
    @export(&onRequireExtensionModifyNonFunctionBinding, .{ .name = "NodeModuleModule__onRequireExtensionModifyNonFunction" });
}

const fun = @import("fun");
const std = @import("std");

const jsc = fun.jsc;
const ErrorableString = jsc.ErrorableString;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
