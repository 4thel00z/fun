comptime {
    if (fun.Environment.isWindows) {
        @export(&Fun__ZigGlobalObject__uvLoop, .{ .name = "Fun__ZigGlobalObject__uvLoop" });
    }
}

pub export fn Fun__VirtualMachine__isShuttingDown(this: *const VirtualMachine) callconv(.c) bool {
    return this.isShuttingDown();
}

pub export fn Fun__getVM() *jsc.VirtualMachine {
    return jsc.VirtualMachine.get();
}

/// Caller must check for termination exception
pub export fn Fun__drainMicrotasks() void {
    jsc.VirtualMachine.get().eventLoop().tick();
}

export fn Fun__readOriginTimer(vm: *jsc.VirtualMachine) u64 {
    // Check if performance.now() is overridden (for fake timers)
    if (vm.overridden_performance_now) |overridden| {
        return overridden;
    }
    return vm.origin_timer.read();
}

export fn Fun__readOriginTimerStart(vm: *jsc.VirtualMachine) f64 {
    // timespce to milliseconds
    return @as(f64, @floatCast((@as(f64, @floatFromInt(vm.origin_timestamp)) + jsc.VirtualMachine.origin_relative_epoch) / 1_000_000.0));
}

pub export fn Fun__GlobalObject__connectedIPC(global: *JSGlobalObject) bool {
    if (global.funVM().ipc) |ipc| {
        if (ipc == .initialized) {
            return ipc.initialized.data.isConnected();
        }
        return true;
    }
    return false;
}
pub export fn Fun__GlobalObject__hasIPC(global: *JSGlobalObject) bool {
    if (global.funVM().ipc != null) {
        return true;
    }
    return false;
}

export fn Fun__VirtualMachine__exitDuringUncaughtException(this: *jsc.VirtualMachine) void {
    this.exit_on_uncaught_exception = true;
}

comptime {
    const Fun__Process__send = jsc.toJSHostFn(Fun__Process__send_);
    @export(&Fun__Process__send, .{ .name = "Fun__Process__send" });
}
pub fn Fun__Process__send_(globalObject: *JSGlobalObject, callFrame: *jsc.CallFrame) fun.JSError!JSValue {
    jsc.markBinding(@src());

    const vm = globalObject.funVM();
    return IPC.doSend(if (vm.getIPCInstance()) |i| &i.data else null, globalObject, callFrame, .process);
}

pub export fn Fun__isFunMain(globalObject: *JSGlobalObject, str: *const fun.String) bool {
    return str.eqlUTF8(globalObject.funVM().main);
}

/// When IPC environment variables are passed, the socket is not immediately opened,
/// but rather we wait for process.on('message') or process.send() to be called, THEN
/// we open the socket. This is to avoid missing messages at the start of the program.
pub export fn Fun__ensureProcessIPCInitialized(globalObject: *JSGlobalObject) void {
    // getIPC() will initialize a "waiting" ipc instance so this is enough.
    // it will do nothing if IPC is not enabled.
    _ = globalObject.funVM().getIPCInstance();
}

/// This function is called on the main thread
/// The funVM() call will assert this
pub export fn Fun__queueTask(global: *JSGlobalObject, task: *jsc.CppTask) void {
    jsc.markBinding(@src());

    global.funVM().eventLoop().enqueueTask(jsc.Task.init(task));
}

pub export fn Bun__reportUnhandledError(globalObject: *JSGlobalObject, value: JSValue) callconv(.c) JSValue {
    jsc.markBinding(@src());

    if (!value.isTerminationException()) {
        _ = globalObject.funVM().uncaughtException(globalObject, value, false);
    }
    return .js_undefined;
}

/// This function is called on another thread
/// The main difference: we need to allocate the task & wakeup the thread
/// We can avoid that if we run it from the main thread.
pub export fn Fun__queueTaskConcurrently(global: *JSGlobalObject, task: *jsc.CppTask) void {
    jsc.markBinding(@src());

    global.funVMConcurrently().eventLoop().enqueueTaskConcurrent(
        jsc.ConcurrentTask.create(jsc.Task.init(task)),
    );
}

pub export fn Fun__handleRejectedPromise(global: *JSGlobalObject, promise: *jsc.JSPromise) void {
    jsc.markBinding(@src());

    const result = promise.result(global.vm());
    var jsc_vm = global.funVM();

    // this seems to happen in some cases when GC is running
    if (result == .zero)
        return;

    jsc_vm.unhandledRejection(global, result, promise.toJS());
    jsc_vm.autoGarbageCollect();
}

pub export fn Fun__handleHandledPromise(global: *JSGlobalObject, promise: *jsc.JSPromise) void {
    const Context = struct {
        globalThis: *jsc.JSGlobalObject,
        promise: jsc.JSValue,
        pub fn callback(context: *@This()) void {
            _ = context.globalThis.funVM().handledPromise(context.globalThis, context.promise);
            context.promise.unprotect();
            fun.default_allocator.destroy(context);
        }
    };
    jsc.markBinding(@src());
    const promise_js = promise.toJS();
    promise_js.protect();
    const context = fun.handleOom(fun.default_allocator.create(Context));
    context.* = .{ .globalThis = global, .promise = promise_js };
    global.funVM().eventLoop().enqueueTask(jsc.ManagedTask.New(Context, Context.callback).init(context));
}

pub export fn Fun__onDidAppendPlugin(jsc_vm: *VirtualMachine, globalObject: *JSGlobalObject) void {
    if (jsc_vm.plugin_runner != null) {
        return;
    }

    jsc_vm.plugin_runner = PluginRunner{
        .global_object = globalObject,
        .allocator = jsc_vm.allocator,
    };
    jsc_vm.transpiler.linker.plugin_runner = &jsc_vm.plugin_runner.?;
}

pub fn Fun__ZigGlobalObject__uvLoop(jsc_vm: *VirtualMachine) callconv(.c) *fun.windows.libuv.Loop {
    return jsc_vm.uvLoop();
}

export fn Fun__setTLSRejectUnauthorizedValue(value: i32) void {
    VirtualMachine.get().default_tls_reject_unauthorized = value != 0;
}

export fn Fun__getTLSRejectUnauthorizedValue() i32 {
    return if (jsc.VirtualMachine.get().getTLSRejectUnauthorized()) 1 else 0;
}

export fn Fun__isNoProxy(hostname_ptr: [*]const u8, hostname_len: usize, host_ptr: [*]const u8, host_len: usize) bool {
    const vm = jsc.VirtualMachine.get();
    const hostname: ?[]const u8 = if (hostname_len > 0) hostname_ptr[0..hostname_len] else null;
    const host: ?[]const u8 = if (host_len > 0) host_ptr[0..host_len] else null;
    return vm.transpiler.env.isNoProxy(hostname, host);
}

export fn Fun__setVerboseFetchValue(value: i32) void {
    VirtualMachine.get().default_verbose_fetch = if (value == 1) .headers else if (value == 2) .curl else .none;
}

export fn Fun__getVerboseFetchValue() i32 {
    return switch (jsc.VirtualMachine.get().getVerboseFetch()) {
        .none => 0,
        .headers => 1,
        .curl => 2,
    };
}

export fn Fun__addBakeSourceProviderSourceMap(vm: *VirtualMachine, opaque_source_provider: *anyopaque, specifier: *fun.String) void {
    var sfb = std.heap.stackFallback(4096, fun.default_allocator);
    const slice = specifier.toUTF8(sfb.get());
    defer slice.deinit();
    vm.source_mappings.putBakeSourceProvider(@as(*BakeSourceProvider, @ptrCast(opaque_source_provider)), slice.slice());
}

export fn Fun__addDevServerSourceProvider(vm: *VirtualMachine, opaque_source_provider: *anyopaque, specifier: *fun.String) void {
    var sfb = std.heap.stackFallback(4096, fun.default_allocator);
    const slice = specifier.toUTF8(sfb.get());
    defer slice.deinit();
    vm.source_mappings.putDevServerSourceProvider(@as(*DevServerSourceProvider, @ptrCast(opaque_source_provider)), slice.slice());
}

export fn Fun__removeDevServerSourceProvider(vm: *VirtualMachine, opaque_source_provider: *anyopaque, specifier: *fun.String) void {
    var sfb = std.heap.stackFallback(4096, fun.default_allocator);
    const slice = specifier.toUTF8(sfb.get());
    defer slice.deinit();
    vm.source_mappings.removeDevServerSourceProvider(@as(*DevServerSourceProvider, @ptrCast(opaque_source_provider)), slice.slice());
}

export fn Fun__addSourceProviderSourceMap(vm: *VirtualMachine, opaque_source_provider: *anyopaque, specifier: *fun.String) void {
    var sfb = std.heap.stackFallback(4096, fun.default_allocator);
    const slice = specifier.toUTF8(sfb.get());
    defer slice.deinit();
    vm.source_mappings.putZigSourceProvider(opaque_source_provider, slice.slice());
}

export fn Fun__removeSourceProviderSourceMap(vm: *VirtualMachine, opaque_source_provider: *anyopaque, specifier: *fun.String) void {
    var sfb = std.heap.stackFallback(4096, fun.default_allocator);
    const slice = specifier.toUTF8(sfb.get());
    defer slice.deinit();
    vm.source_mappings.removeZigSourceProvider(opaque_source_provider, slice.slice());
}

pub fn Fun__setSyntheticAllocationLimitForTesting(globalObject: *JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!JSValue {
    const args = callframe.arguments_old(1).slice();
    if (args.len < 1) {
        return globalObject.throwNotEnoughArguments("setSyntheticAllocationLimitForTesting", 1, args.len);
    }

    if (!args[0].isNumber()) {
        return globalObject.throwInvalidArguments("setSyntheticAllocationLimitForTesting expects a number", .{});
    }

    const limit: usize = @intCast(@max(try args[0].coerceToInt64(globalObject), 1024 * 1024));
    const prev = VirtualMachine.synthetic_allocation_limit;
    VirtualMachine.synthetic_allocation_limit = limit;
    VirtualMachine.string_allocation_limit = limit;
    return JSValue.jsNumber(prev);
}

const IPC = @import("./ipc.zig");
const std = @import("std");

const fun = @import("fun");
const PluginRunner = fun.transpiler.PluginRunner;

const BakeSourceProvider = fun.SourceMap.BakeSourceProvider;
const DevServerSourceProvider = fun.SourceMap.DevServerSourceProvider;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
const VirtualMachine = jsc.VirtualMachine;
