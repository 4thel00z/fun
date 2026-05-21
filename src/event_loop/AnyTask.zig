//! This is a slower wrapper around a function pointer.
//! Prefer adding a task type directly to `Task` instead of using this.

const AnyTask = @This();

ctx: ?*anyopaque,
callback: *const (fn (*anyopaque) fun.JSError!void),

pub fn task(this: *AnyTask) Task {
    return Task.init(this);
}

pub fn run(this: *AnyTask) fun.JSError!void {
    @setRuntimeSafety(false);
    const callback = this.callback;
    const ctx = this.ctx;
    try callback(ctx.?);
}

pub fn New(comptime Type: type, comptime Callback: anytype) type {
    return struct {
        pub fn init(ctx: *Type) AnyTask {
            return AnyTask{
                .callback = wrap,
                .ctx = ctx,
            };
        }

        pub fn wrap(this: ?*anyopaque) fun.JSError!void {
            return @call(fun.callmod_inline, Callback, .{@as(*Type, @ptrCast(@alignCast(this.?)))});
        }
    };
}

const fun = @import("fun");

const jsc = fun.jsc;
const Task = jsc.Task;
