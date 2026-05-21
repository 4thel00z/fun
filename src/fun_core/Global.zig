const Global = @This();

/// Does not have the canary tag, because it is exposed in `Fun.version`
/// "1.0.0" or "1.0.0-debug"
pub const package_json_version = if (Environment.isDebug)
    version_string ++ "-debug"
else
    version_string;

/// This is used for `fun` without any arguments, it `package_json_version` but with canary if it is a canary build.
/// like "1.0.0-canary.12"
pub const package_json_version_with_canary = if (Environment.isDebug)
    version_string ++ "-debug"
else if (Environment.is_canary)
    std.fmt.comptimePrint("{s}-canary.{d}", .{ version_string, Environment.canary_revision })
else
    version_string;

/// The version and a short hash in parenthesis.
pub const package_json_version_with_sha = if (Environment.git_sha.len == 0)
    package_json_version
else if (Environment.isDebug)
    std.fmt.comptimePrint("{s} ({s})", .{ version_string, Environment.git_sha[0..@min(Environment.git_sha.len, 8)] })
else if (Environment.is_canary)
    std.fmt.comptimePrint("{s}-canary.{d} ({s})", .{ version_string, Environment.canary_revision, Environment.git_sha[0..@min(Environment.git_sha.len, 8)] })
else
    std.fmt.comptimePrint("{s} ({s})", .{ version_string, Environment.git_sha[0..@min(Environment.git_sha.len, 8)] });

/// What is printed by `fun --revision`
/// "1.0.0+abcdefghi" or "1.0.0-canary.12+abcdefghi"
pub const package_json_version_with_revision = if (Environment.git_sha.len == 0)
    package_json_version
else if (Environment.isDebug)
    std.fmt.comptimePrint(version_string ++ "-debug+{s}", .{Environment.git_sha_short})
else if (Environment.is_canary)
    std.fmt.comptimePrint(version_string ++ "-canary.{d}+{s}", .{ Environment.canary_revision, Environment.git_sha_short })
else
    std.fmt.comptimePrint(version_string ++ "+{s}", .{Environment.git_sha_short});

// Node-style platform string. Distinct from Environment.os.nameString() on
// Android: the kernel-level OS enum stays .linux (so syscall switches keep
// working), but user-facing strings — npm user-agent, process.platform —
// must be "android" so native-addon postinstalls don't fetch glibc binaries.
pub const os_name = if (Environment.isAndroid) "android" else Environment.os.nameString();
pub const os_display = if (Environment.isAndroid) "Android" else Environment.os.displayString();

// Fun v1.0.0 (Linux x64 baseline)
// Fun v1.0.0-debug (Linux x64)
// Fun v1.0.0-canary.0+44e09bb7f (Linux x64)
pub const unhandled_error_fun_version_string = "Fun v" ++
    (if (Environment.is_canary) package_json_version_with_revision else package_json_version) ++
    " (" ++ os_display ++ " " ++ arch_name ++
    (if (Environment.baseline) " baseline)" else ")");

pub const arch_name = if (Environment.isX64)
    "x64"
else if (Environment.isX86)
    "x86"
else if (Environment.isAarch64)
    "arm64"
else
    "unknown";

pub inline fn getStartTime() i128 {
    return fun.start_time;
}

extern "kernel32" fn SetThreadDescription(thread: std.os.windows.HANDLE, name: [*:0]const u16) callconv(.winapi) std.os.windows.HRESULT;

pub fn setThreadName(name: [:0]const u8) void {
    if (Environment.isLinux) {
        _ = std.posix.prctl(.SET_NAME, .{@intFromPtr(name.ptr)}) catch 0;
    } else if (Environment.isMac) {
        _ = std.c.pthread_setname_np(name);
    } else if (Environment.isFreeBSD) {
        std.c.pthread_set_name_np(std.c.pthread_self(), name);
    } else if (Environment.isWindows) {
        // TODO: use SetThreadDescription or NtSetInformationThread with 0x26 (ThreadNameInformation)
        // without causing exit code 0xC0000409 (stack buffer overrun) in child process
    }
}

const ExitFn = *const fn () callconv(.c) void;

var on_exit_callbacks = std.ArrayListUnmanaged(ExitFn){};
export fn Fun__atexit(function: ExitFn) void {
    if (std.mem.indexOfScalar(ExitFn, on_exit_callbacks.items, function) == null) {
        on_exit_callbacks.append(fun.default_allocator, function) catch {};
    }
}

pub fn addExitCallback(function: ExitFn) void {
    Fun__atexit(function);
}

pub fn runExitCallbacks() void {
    for (on_exit_callbacks.items) |callback| {
        callback();
    }
    on_exit_callbacks.items.len = 0;
}

var is_exiting = std.atomic.Value(bool).init(false);
export fn fun_is_exiting() c_int {
    return @intFromBool(isExiting());
}
pub fn isExiting() bool {
    return is_exiting.load(.monotonic);
}

/// Flushes stdout and stderr (in exit/quick_exit callback) and exits with the given code.
pub fn exit(code: u32) noreturn {
    is_exiting.store(true, .monotonic);
    _ = @atomicRmw(usize, &fun.analytics.Features.exited, .Add, 1, .monotonic);

    // If we are crashing, allow the crash handler to finish it's work.
    fun.crash_handler.sleepForeverIfAnotherThreadIsCrashing();

    if (Environment.isDebug) {
        fun.assert(fun.debug_allocator_data.backing.?.deinit() == .ok);
        fun.debug_allocator_data.backing = null;
    }

    // Flush output before exiting to ensure all messages are visible
    Output.flush();

    switch (Environment.os) {
        .mac => std.c.exit(@bitCast(code)),
        .windows => {
            Fun__onExit();
            std.os.windows.kernel32.ExitProcess(code);
        },
        else => {
            if (Environment.enable_asan) {
                std.c.exit(@bitCast(code));
                std.c.abort(); // exit should be noreturn
            }
            fun.c.quick_exit(@bitCast(code));
            std.c.abort(); // quick_exit should be noreturn
        },
    }
}

pub fn raiseIgnoringPanicHandler(sig: fun.SignalCode) noreturn {
    Output.flush();
    Output.Source.Stdio.restore();

    // clear segfault handler
    fun.crash_handler.resetSegfaultHandler();

    // clear signal handler
    if (fun.Environment.os != .windows) {
        var sa: fun.sys.Sigaction = .{
            .handler = .{ .handler = std.posix.SIG.DFL },
            .mask = fun.sys.sigemptyset(),
            .flags = std.posix.SA.RESETHAND,
        };
        fun.sys.sigaction(@intFromEnum(sig), &sa, null);
    }

    // kill self
    _ = std.c.raise(@intFromEnum(sig));
    std.c.abort();
}

pub const AllocatorConfiguration = struct {
    verbose: bool = false,
    long_running: bool = false,
};

pub inline fn mimalloc_cleanup(force: bool) void {
    if (comptime use_mimalloc) {
        Mimalloc.mi_collect(force);
    }
}
// Versions are now handled by build-generated header (fun_dependency_versions.h)

// Enabling huge pages slows down fun by 8x or so
// Keeping this code for:
// 1. documentation that an attempt was made
// 2. if I want to configure allocator later
pub inline fn configureAllocator(_: AllocatorConfiguration) void {}

pub fn notimpl() noreturn {
    @branchHint(.cold);
    Output.panic("Not implemented yet!!!!!", .{});
}

// Make sure we always print any leftover
pub fn crash() noreturn {
    @branchHint(.cold);
    Global.exit(1);
}

pub const FunInfo = struct {
    fun_version: string,
    platform: analytics.GenerateHeader.GeneratePlatform.Platform,

    const analytics = fun.analytics;
    const JSON = fun.json;
    const JSAst = fun.ast;
    pub fn generate(comptime Bundler: type, _: Bundler, allocator: std.mem.Allocator) !JSAst.Expr {
        const info = FunInfo{
            .fun_version = Global.package_json_version,
            .platform = analytics.GenerateHeader.GeneratePlatform.forOS(),
        };

        return try JSON.toAST(allocator, FunInfo, info);
    }
};

pub const user_agent = "Fun/" ++ Global.package_json_version;
pub export const Fun__userAgent: [*:0]const u8 = Global.user_agent;

comptime {
    _ = Fun__userAgent;
}

pub export fn Fun__onExit() void {
    fun.jsc.Node.FSEvents.closeAndWait();

    runExitCallbacks();
    Output.flush();
    std.mem.doNotOptimizeAway(&Fun__atexit);

    Output.Source.Stdio.restore();
}

comptime {
    _ = Fun__onExit;
}

const string = []const u8;

const Output = @import("./output.zig");
const std = @import("std");

const Environment = @import("./env.zig");
const version_string = Environment.version_string;

const fun = @import("fun");
const Mimalloc = fun.mimalloc;
const use_mimalloc = fun.use_mimalloc;
