/// A task created from C++ code, usually via ScriptExecutionContext.
pub const CppTask = opaque {
    pub fn run(this: *CppTask, global: *jsc.JSGlobalObject) fun.JSError!void {
        jsc.markBinding(@src());
        return fun.cpp.Fun__performTask(global, this);
    }
};

/// A task created from C++ code that runs inside the workpool, usually via ScriptExecutionContext.
pub const ConcurrentCppTask = struct {
    pub const new = fun.TrivialNew(@This());

    cpp_task: *EventLoopTaskNoContext,
    workpool_task: jsc.WorkPoolTask = .{ .callback = &runFromWorkpool },

    const EventLoopTaskNoContext = opaque {
        extern fn Fun__EventLoopTaskNoContext__performTask(task: *EventLoopTaskNoContext) void;
        extern fn Fun__EventLoopTaskNoContext__createdInFunVm(task: *const EventLoopTaskNoContext) ?*VirtualMachine;

        /// Deallocates `this`
        pub fn run(this: *EventLoopTaskNoContext) void {
            Fun__EventLoopTaskNoContext__performTask(this);
        }

        /// Get the VM that created this task
        pub fn getVM(this: *const EventLoopTaskNoContext) ?*VirtualMachine {
            return Fun__EventLoopTaskNoContext__createdInFunVm(this);
        }
    };

    pub fn runFromWorkpool(task: *jsc.WorkPoolTask) void {
        const this: *ConcurrentCppTask = @fieldParentPtr("workpool_task", task);
        // Extract all the info we need from `this` and `cpp_task` before we call functions that
        // free them
        const cpp_task = this.cpp_task;
        const maybe_vm = cpp_task.getVM();
        fun.destroy(this);
        cpp_task.run();
        if (maybe_vm) |vm| {
            vm.event_loop.unrefConcurrently();
        }
    }

    pub export fn ConcurrentCppTask__createAndRun(cpp_task: *EventLoopTaskNoContext) void {
        jsc.markBinding(@src());
        if (cpp_task.getVM()) |vm| {
            vm.event_loop.refConcurrently();
        }
        const cpp = ConcurrentCppTask.new(.{ .cpp_task = cpp_task });
        jsc.WorkPool.schedule(&cpp.workpool_task);
    }
};

comptime {
    _ = ConcurrentCppTask.ConcurrentCppTask__createAndRun;
}

const fun = @import("fun");

const jsc = fun.jsc;
const VirtualMachine = jsc.VirtualMachine;
