pub const panic = _fun.crash_handler.panic;
pub const std_options = std.Options{
    .enable_segfault_handler = false,
    // Use BoringSSL's RAND_bytes instead of the default getrandom() syscall.
    // BoringSSL falls back to /dev/urandom on older kernels (< 3.17) where
    // the getrandom syscall doesn't exist, avoiding a panic on ENOSYS.
    .cryptoRandomSeed = _fun.csprng,
};

pub const io_mode = .blocking;

comptime {
    _fun.assert(builtin.target.cpu.arch.endian() == .little);
}

extern fn fun_warn_avx_missing(url: [*:0]const u8) void;

pub extern "c" var _environ: ?*anyopaque;
pub extern "c" var environ: ?*anyopaque;

pub fn main() void {
    _fun.crash_handler.init();

    if (Environment.isPosix) {
        var act: _fun.sys.Sigaction = .{
            .handler = .{ .handler = std.posix.SIG.IGN },
            .mask = _fun.sys.sigemptyset(),
            .flags = 0,
        };
        _fun.sys.sigaction(std.posix.SIG.PIPE, &act, null);
        _fun.sys.sigaction(std.posix.SIG.XFSZ, &act, null);
    }

    if (Environment.isDebug) {
        _fun.debug_allocator_data.backing = .init;
    }

    // This should appear before we make any calls at all to libuv.
    // So it's safest to put it very early in the main function.
    if (Environment.isWindows) {
        _ = _fun.windows.libuv.uv_replace_allocator(
            &_fun.mimalloc.mi_malloc,
            &_fun.mimalloc.mi_realloc,
            &_fun.mimalloc.mi_calloc,
            &_fun.mimalloc.mi_free,
        );
        _fun.handleOom(_fun.windows.env.convertEnvToWTF8());
        environ = @ptrCast(std.os.environ.ptr);
        _environ = @ptrCast(std.os.environ.ptr);
    }

    _fun.start_time = std.time.nanoTimestamp();
    _fun.initArgv() catch |err| {
        Output.panic("Failed to initialize argv: {s}\n", .{@errorName(err)});
    };

    Output.Source.Stdio.init();
    defer Output.flush();
    if (Environment.isX64 and Environment.enableSIMD and Environment.isPosix) {
        fun_warn_avx_missing(_fun.cli.UpgradeCommand.Fun__githubBaselineURL.ptr);
    }

    _fun.StackCheck.configureThread();
    _fun.ParentDeathWatchdog.install();

    _fun.cli.Cli.start(_fun.default_allocator);
    _fun.Global.exit(0);
}

pub export fn Fun__panic(msg: [*]const u8, len: usize) noreturn {
    Output.panic("{s}", .{msg[0..len]});
}

// -- Zig Standard Library Additions --
pub fn copyForwards(comptime T: type, dest: []T, source: []const T) void {
    if (source.len == 0) {
        return;
    }
    _fun.copy(T, dest[0..source.len], source);
}
pub fn copyBackwards(comptime T: type, dest: []T, source: []const T) void {
    if (source.len == 0) {
        return;
    }
    _fun.copy(T, dest[0..source.len], source);
}
pub fn eqlBytes(src: []const u8, dest: []const u8) bool {
    return _fun.c.memcmp(src.ptr, dest.ptr, src.len) == 0;
}
// -- End Zig Standard Library Additions --

// Claude thinks its @import("root").fun when it's @import("fun").
const fun = @compileError("Deprecated: Use @import(\"fun\") instead");

const builtin = @import("builtin");
const std = @import("std");

const _fun = @import("fun");
const Environment = _fun.Environment;
const Output = _fun.Output;
