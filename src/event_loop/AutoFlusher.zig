registered: bool = false,

pub fn registerDeferredMicrotaskWithType(comptime Type: type, this: *Type, vm: *jsc.VirtualMachine) void {
    if (this.auto_flusher.registered) return;
    registerDeferredMicrotaskWithTypeUnchecked(Type, this, vm);
}

pub fn unregisterDeferredMicrotaskWithType(comptime Type: type, this: *Type, vm: *jsc.VirtualMachine) void {
    if (!this.auto_flusher.registered) return;
    unregisterDeferredMicrotaskWithTypeUnchecked(Type, this, vm);
}

pub fn unregisterDeferredMicrotaskWithTypeUnchecked(comptime Type: type, this: *Type, vm: *jsc.VirtualMachine) void {
    fun.assert(this.auto_flusher.registered);
    fun.assert(vm.eventLoop().deferred_tasks.unregisterTask(this));
    this.auto_flusher.registered = false;
}

pub fn registerDeferredMicrotaskWithTypeUnchecked(comptime Type: type, this: *Type, vm: *jsc.VirtualMachine) void {
    fun.assert(!this.auto_flusher.registered);
    this.auto_flusher.registered = true;
    fun.assert(!vm.eventLoop().deferred_tasks.postTask(this, @ptrCast(&Type.onAutoFlush)));
}

const fun = @import("fun");
const jsc = fun.jsc;
