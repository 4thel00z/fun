const JSCScheduler = @This();

pub const JSCDeferredWorkTask = opaque {
    extern fn Fun__runDeferredWork(task: *JSCScheduler.JSCDeferredWorkTask) void;
    pub fn run(task: *JSCScheduler.JSCDeferredWorkTask) fun.JSTerminated!void {
        const globalThis = fun.jsc.VirtualMachine.get().global;
        var scope: fun.jsc.ExceptionValidationScope = undefined;
        scope.init(globalThis, @src());
        defer scope.deinit();
        Fun__runDeferredWork(task);
        try scope.assertNoExceptionExceptTermination();
    }
};

export fn Fun__eventLoop__incrementRefConcurrently(jsc_vm: *VirtualMachine, delta: c_int) void {
    jsc.markBinding(@src());

    if (delta > 0) {
        jsc_vm.event_loop.refConcurrently();
    } else {
        jsc_vm.event_loop.unrefConcurrently();
    }
}

export fn Fun__queueJSCDeferredWorkTaskConcurrently(jsc_vm: *VirtualMachine, task: *JSCScheduler.JSCDeferredWorkTask) void {
    jsc.markBinding(@src());
    var loop = jsc_vm.eventLoop();
    loop.enqueueTaskConcurrent(ConcurrentTask.new(.{
        .task = Task.init(task),
        .next = .auto_delete,
    }));
}

export fn Fun__tickWhilePaused(paused: *bool) void {
    jsc.markBinding(@src());
    VirtualMachine.get().eventLoop().tickWhilePaused(paused);
}

comptime {
    _ = Fun__eventLoop__incrementRefConcurrently;
    _ = Fun__queueJSCDeferredWorkTaskConcurrently;
    _ = Fun__tickWhilePaused;
}

const fun = @import("fun");

const jsc = fun.jsc;
const ConcurrentTask = jsc.ConcurrentTask;
const Task = jsc.Task;
const VirtualMachine = jsc.VirtualMachine;
