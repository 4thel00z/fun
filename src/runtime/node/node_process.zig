//! Process information and control APIs (`globalThis.process` / `node:process`)
comptime {
    @export(&getTitle, .{ .name = "Fun__Process__getTitle" });
    @export(&setTitle, .{ .name = "Fun__Process__setTitle" });
    @export(&createArgv, .{ .name = "Fun__Process__createArgv" });
    @export(&getCwd, .{ .name = "Fun__Process__getCwd" });
    @export(&setCwd, .{ .name = "Fun__Process__setCwd" });
    @export(&exit, .{ .name = "Fun__Process__exit" });
    @export(&createArgv0, .{ .name = "Fun__Process__createArgv0" });
    @export(&getExecPath, .{ .name = "Fun__Process__getExecPath" });
    @export(&fun.jsc.host_fn.wrap1(createExecArgv), .{ .name = "Fun__Process__createExecArgv" });
    @export(&getEval, .{ .name = "Fun__Process__getEval" });
}

var title_mutex = fun.Mutex{};

pub fn getTitle(_: *JSGlobalObject, title: *fun.String) callconv(.c) void {
    title_mutex.lock();
    defer title_mutex.unlock();
    const str = fun.cli.Fun__Node__ProcessTitle;
    title.* = fun.String.cloneUTF8(str orelse "fun");
}

// TODO: https://github.com/nodejs/node/blob/master/deps/uv/src/unix/darwin-proctitle.c
pub fn setTitle(globalObject: *JSGlobalObject, newvalue: *fun.String) callconv(.c) void {
    defer newvalue.deref();
    title_mutex.lock();
    defer title_mutex.unlock();

    const new_title = newvalue.toOwnedSlice(fun.default_allocator) catch {
        globalObject.throwOutOfMemory() catch {};
        return;
    };

    if (fun.cli.Fun__Node__ProcessTitle) |slice| fun.default_allocator.free(slice);
    fun.cli.Fun__Node__ProcessTitle = new_title;
}

pub fn createArgv0(globalObject: *jsc.JSGlobalObject) callconv(.c) jsc.JSValue {
    return jsc.ZigString.fromUTF8(fun.argv[0]).toJS(globalObject);
}

pub fn getExecPath(globalObject: *jsc.JSGlobalObject) callconv(.c) jsc.JSValue {
    const out = fun.selfExePath() catch {
        // if for any reason we are unable to get the executable path, we just return argv[0]
        return createArgv0(globalObject);
    };

    return jsc.ZigString.fromUTF8(out).toJS(globalObject);
}

fn createExecArgv(globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    var sfb = std.heap.stackFallback(4096, globalObject.allocator());
    const temp_alloc = sfb.get();
    const vm = globalObject.funVM();

    if (vm.worker) |worker| {
        // was explicitly overridden for the worker?
        if (worker.execArgv) |execArgv| {
            const array = try jsc.JSValue.createEmptyArray(globalObject, execArgv.len);
            for (0..execArgv.len) |i| {
                try array.putIndex(globalObject, @intCast(i), try fun.String.init(execArgv[i]).toJS(globalObject));
            }
            return array;
        }
    }

    // For compiled/standalone executables, execArgv should contain compile_exec_argv and FUN_OPTIONS.
    // Use appendOptionsEnv for FUN_OPTIONS to correctly handle quoted values.
    if (vm.standalone_module_graph) |graph| {
        if (graph.compile_exec_argv.len > 0 or fun.fun_options_argc > 0) {
            var args = std.array_list.Managed(fun.String).init(temp_alloc);
            defer args.deinit();
            defer for (args.items) |*arg| arg.deref();

            // Process FUN_OPTIONS first using appendOptionsEnv for proper quote handling.
            // appendOptionsEnv inserts starting at index 1, so we need a placeholder.
            if (fun.fun_options_argc > 0) {
                if (fun.env_var.FUN_OPTIONS.get()) |opts| {
                    try args.append(fun.String.empty); // placeholder for insert-at-1
                    try fun.appendOptionsEnv(opts, fun.String, &args);
                    _ = args.orderedRemove(0); // remove placeholder
                }
            }

            if (graph.compile_exec_argv.len > 0) {
                var tokenizer = std.mem.tokenizeAny(u8, graph.compile_exec_argv, " \t\n\r");
                while (tokenizer.next()) |token| {
                    try args.append(fun.String.cloneUTF8(token));
                }
            }

            const array = try jsc.JSValue.createEmptyArray(globalObject, args.items.len);
            for (0..args.items.len) |idx| {
                try array.putIndex(globalObject, @intCast(idx), try args.items[idx].toJS(globalObject));
            }
            return array;
        }
        return try jsc.JSValue.createEmptyArray(globalObject, 0);
    }

    var args = try std.array_list.Managed(fun.String).initCapacity(temp_alloc, fun.argv.len - 1);
    defer args.deinit();
    defer for (args.items) |*arg| arg.deref();

    var seen_run = false;
    var prev: ?[]const u8 = null;

    // we re-parse the process argv to extract execArgv, since this is a very uncommon operation
    // it isn't worth doing this as a part of the CLI
    for (fun.argv[@min(1, fun.argv.len)..]) |arg| {
        defer prev = arg;

        if (arg.len >= 1 and arg[0] == '-') {
            try args.append(fun.String.cloneUTF8(arg));
            continue;
        }

        if (!seen_run and fun.strings.eqlComptime(arg, "run")) {
            seen_run = true;
            continue;
        }

        // A set of execArgv args consume an extra argument, so we do not want to
        // confuse these with script names.
        const map = fun.ComptimeStringMap(void, comptime brk: {
            const auto_params = fun.cli.Arguments.auto_params;
            const KV = struct { []const u8, void };
            var entries: [auto_params.len]KV = undefined;
            var i = 0;
            for (auto_params) |param| {
                if (param.takes_value != .none) {
                    if (param.names.long) |name| {
                        entries[i] = .{ "--" ++ name, {} };
                        i += 1;
                    }
                    if (param.names.short) |name| {
                        entries[i] = .{ &[_]u8{ '-', name }, {} };
                        i += 1;
                    }
                }
            }

            var result: [i]KV = undefined;
            @memcpy(&result, entries[0..i]);
            break :brk result;
        });

        if (prev) |p| if (map.has(p)) {
            try args.append(fun.String.cloneUTF8(arg));
            continue;
        };

        // we hit the script name
        break;
    }

    return fun.String.toJSArray(globalObject, args.items);
}

fn createArgv(globalObject: *jsc.JSGlobalObject) callconv(.c) jsc.JSValue {
    const vm = globalObject.funVM();

    // Allocate up to 32 strings in stack
    var stack_fallback_allocator = std.heap.stackFallback(
        32 * @sizeOf(jsc.ZigString) + (fun.MAX_PATH_BYTES + 1) + 32,
        fun.default_allocator,
    );
    const allocator = stack_fallback_allocator.get();

    var args_count: usize = vm.argv.len;
    if (vm.worker) |worker| {
        args_count = worker.argv.len;
    }

    const args = allocator.alloc(
        fun.String,
        // argv omits "fun" because it could be "fun run" or "fun" and it's kind of ambiguous
        // argv also omits the script name
        args_count + 2,
    ) catch |err| fun.handleOom(err);
    defer allocator.free(args);

    var args_list: std.ArrayListUnmanaged(fun.String) = .initBuffer(args);

    if (vm.standalone_module_graph != null) {
        // Don't break user's code because they did process.argv.slice(2)
        // Even if they didn't type "fun", we still want to add it as argv[0]
        args_list.appendAssumeCapacity(
            fun.String.static("fun"),
        );
    } else {
        const exe_path = fun.selfExePath() catch null;
        args_list.appendAssumeCapacity(
            if (exe_path) |str| fun.String.borrowUTF8(str) else fun.String.static("fun"),
        );
    }

    if (vm.main.len > 0 and
        !strings.endsWithComptime(vm.main, fun.pathLiteral("/[eval]")) and
        !strings.endsWithComptime(vm.main, fun.pathLiteral("/[stdin]")))
    {
        if (vm.worker != null and vm.worker.?.eval_mode) {
            args_list.appendAssumeCapacity(fun.String.static("[worker eval]"));
        } else {
            args_list.appendAssumeCapacity(fun.String.borrowUTF8(vm.main));
        }
    }

    if (vm.worker) |worker| {
        for (worker.argv) |arg| {
            args_list.appendAssumeCapacity(fun.String.init(arg));
        }
    } else {
        for (vm.argv) |arg| {
            const str = fun.String.borrowUTF8(arg);
            // https://github.com/yargs/yargs/blob/adb0d11e02c613af3d9427b3028cc192703a3869/lib/utils/process-argv.ts#L1
            args_list.appendAssumeCapacity(str);
        }
    }

    return fun.String.toJSArray(globalObject, args_list.items) catch .zero;
}

extern fn Fun__Process__getArgv(global: *JSGlobalObject) JSValue;
pub fn getArgv(global: *JSGlobalObject) callconv(.c) JSValue {
    return Fun__Process__getArgv(global);
}

extern fn Fun__Process__getExecArgv(global: *JSGlobalObject) JSValue;
pub fn getExecArgv(global: *JSGlobalObject) callconv(.c) JSValue {
    return Fun__Process__getExecArgv(global);
}

pub fn getEval(globalObject: *jsc.JSGlobalObject) callconv(.c) jsc.JSValue {
    const vm = globalObject.funVM();
    if (vm.module_loader.eval_source) |source| {
        return jsc.ZigString.init(source.contents).toJS(globalObject);
    }
    return .js_undefined;
}

pub const getCwd = jsc.host_fn.wrap1(getCwd_);
fn getCwd_(globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    var buf: fun.PathBuffer = undefined;
    switch (fun.api.node.path.getCwd(&buf)) {
        .result => |r| return jsc.ZigString.init(r).withEncoding().toJS(globalObject),
        .err => |e| {
            return globalObject.throwValue(try e.toJS(globalObject));
        },
    }
}

pub const setCwd = jsc.host_fn.wrap2(setCwd_);
fn setCwd_(globalObject: *jsc.JSGlobalObject, to: *jsc.ZigString) fun.JSError!jsc.JSValue {
    if (to.len == 0) {
        return globalObject.throwInvalidArguments("Expected path to be a non-empty string", .{});
    }
    const vm = globalObject.funVM();
    const fs = vm.transpiler.fs;

    var buf: fun.PathBuffer = undefined;
    const slice = to.sliceZBuf(&buf) catch return globalObject.throw("Invalid path", .{});

    switch (Syscall.chdir(fs.top_level_dir, slice)) {
        .result => {
            // When we update the cwd from JS, we have to update the bundler's version as well
            // However, this might be called many times in a row, so we use a pre-allocated buffer
            // that way we don't have to worry about garbage collector
            const into_cwd_buf = switch (fun.sys.getcwd(&buf)) {
                .result => |r| r,
                .err => |err| {
                    _ = Syscall.chdir(fs.top_level_dir, fs.top_level_dir);
                    return globalObject.throwValue(try err.toJS(globalObject));
                },
            };
            @memcpy(fs.top_level_dir_buf[0..into_cwd_buf.len], into_cwd_buf);
            fs.top_level_dir_buf[into_cwd_buf.len] = 0;
            fs.top_level_dir = fs.top_level_dir_buf[0..into_cwd_buf.len :0];

            const len = fs.top_level_dir.len;
            // Ensure the path ends with a slash
            if (fs.top_level_dir_buf[len - 1] != std.fs.path.sep) {
                fs.top_level_dir_buf[len] = std.fs.path.sep;
                fs.top_level_dir_buf[len + 1] = 0;
                fs.top_level_dir = fs.top_level_dir_buf[0 .. len + 1 :0];
            }
            const withoutTrailingSlash = if (Environment.isWindows) strings.withoutTrailingSlashWindowsPath else strings.withoutTrailingSlash;
            var str = fun.String.cloneUTF8(withoutTrailingSlash(fs.top_level_dir));
            return str.transferToJS(globalObject);
        },
        .err => |e| {
            return globalObject.throwValue(try e.toJS(globalObject));
        },
    }
}

// TODO(@190n) this may need to be noreturn
pub fn exit(globalObject: *jsc.JSGlobalObject, code: u8) callconv(.c) void {
    var vm = globalObject.funVM();
    vm.exit_handler.exit_code = code;
    if (vm.worker) |worker| {
        // TODO(@190n) we may need to use requestTerminate or throwTerminationException
        // instead to terminate the worker sooner
        worker.exit();
    } else {
        vm.onExit();
        vm.globalExit();
    }
}

// TODO: switch this to using *fun.wtf.String when it is added
pub fn Fun__Process__editWindowsEnvVar(k: fun.String, v: fun.String) callconv(.c) void {
    comptime fun.assert(fun.Environment.isWindows);
    if (k.tag == .Empty) return;
    const wtf1 = k.value.WTFStringImpl;
    var fixed_stack_allocator = std.heap.stackFallback(1025, fun.default_allocator);
    const allocator = fixed_stack_allocator.get();
    var buf1 = fun.handleOom(allocator.alloc(u16, k.utf16ByteLength() + 1));
    defer allocator.free(buf1);
    var buf2 = fun.handleOom(allocator.alloc(u16, v.utf16ByteLength() + 1));
    defer allocator.free(buf2);
    const len1: usize = switch (wtf1.is8Bit()) {
        true => fun.strings.copyLatin1IntoUTF16([]u16, buf1, wtf1.latin1Slice()).written,
        false => b: {
            @memcpy(buf1[0..wtf1.length()], wtf1.utf16Slice());
            break :b wtf1.length();
        },
    };
    buf1[len1] = 0;
    const str2: ?[*:0]const u16 = if (v.tag != .Dead) str: {
        if (v.tag == .Empty) break :str (&[_]u16{0})[0..0 :0];
        const wtf2 = v.value.WTFStringImpl;
        const len2: usize = switch (wtf2.is8Bit()) {
            true => fun.strings.copyLatin1IntoUTF16([]u16, buf2, wtf2.latin1Slice()).written,
            false => b: {
                @memcpy(buf2[0..wtf2.length()], wtf2.utf16Slice());
                break :b wtf2.length();
            },
        };
        buf2[len2] = 0;
        break :str buf2[0..len2 :0].ptr;
    } else null;
    _ = fun.c.SetEnvironmentVariableW(buf1[0..len1 :0].ptr, str2);
}

comptime {
    if (Environment.export_cpp_apis and Environment.isWindows) {
        @export(&Fun__Process__editWindowsEnvVar, .{ .name = "Fun__Process__editWindowsEnvVar" });
    }
}

pub export fn Fun__NODE_NO_WARNINGS() bool {
    return fun.feature_flag.NODE_NO_WARNINGS.get();
}

pub export fn Fun__suppressCrashOnProcessKillSelfIfDesired() void {
    if (fun.feature_flag.FUN_INTERNAL_SUPPRESS_CRASH_ON_PROCESS_KILL_SELF.get()) {
        fun.crash_handler.suppressReporting();
    }
}

pub export const Fun__version: [*:0]const u8 = "v" ++ fun.Global.package_json_version;
pub export const Fun__version_with_sha: [*:0]const u8 = "v" ++ fun.Global.package_json_version_with_sha;
// Version exports removed - now handled by build-generated header (fun_dependency_versions.h)
// The C++ code in FunProcess.cpp uses the generated header directly
pub export const Fun__versions_uws: [*:0]const u8 = fun.Environment.git_sha;
pub export const Fun__versions_usockets: [*:0]const u8 = fun.Environment.git_sha;
pub export const Fun__version_sha: [*:0]const u8 = fun.Environment.git_sha;

const std = @import("std");

const fun = @import("fun");
const Environment = fun.Environment;
const Syscall = fun.sys;
const strings = fun.strings;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
const ZigString = jsc.ZigString;
