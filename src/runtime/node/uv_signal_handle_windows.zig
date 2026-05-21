//! Windows-only `uv_signal_t` lifecycle exported for `FunProcess.cpp`.
//! Lives under `runtime/` because `init` takes a `*JSGlobalObject` to reach
//! the VM's libuv loop; the rest of `sys/windows/` is JSC-free.

fn Fun__UVSignalHandle__init(
    global: *fun.jsc.JSGlobalObject,
    signal_num: i32,
    callback: *const fn (sig: *libuv.uv_signal_t, num: c_int) callconv(.c) void,
) callconv(.c) ?*libuv.uv_signal_t {
    const signal = fun.new(libuv.uv_signal_t, undefined);

    var rc = libuv.uv_signal_init(global.funVM().uvLoop(), signal);
    if (rc.errno()) |_| {
        fun.destroy(signal);
        return null;
    }

    rc = libuv.uv_signal_start(signal, callback, signal_num);
    if (rc.errno()) |_| {
        libuv.uv_close(@ptrCast(signal), &freeWithDefaultAllocator);
        return null;
    }

    libuv.uv_unref(@ptrCast(signal));

    return signal;
}

fn freeWithDefaultAllocator(signal: *anyopaque) callconv(.c) void {
    fun.destroy(@as(*libuv.uv_signal_t, @ptrCast(@alignCast(signal))));
}

fn Fun__UVSignalHandle__close(signal: *libuv.uv_signal_t) callconv(.c) void {
    _ = libuv.uv_signal_stop(signal);
    libuv.uv_close(@ptrCast(signal), &freeWithDefaultAllocator);
}

comptime {
    if (fun.Environment.isWindows) {
        @export(&Fun__UVSignalHandle__init, .{ .name = "Fun__UVSignalHandle__init" });
        @export(&Fun__UVSignalHandle__close, .{ .name = "Fun__UVSignalHandle__close" });
    }
}

const fun = @import("fun");
const libuv = fun.windows.libuv;
