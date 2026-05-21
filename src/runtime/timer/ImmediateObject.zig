const Self = @This();

const RefCount = fun.ptr.RefCount(@This(), "ref_count", deinit, .{});
pub const ref = RefCount.ref;
pub const deref = RefCount.deref;

pub const js = jsc.Codegen.JSImmediate;
pub const toJS = js.toJS;
pub const fromJS = js.fromJS;
pub const fromJSDirect = js.fromJSDirect;

ref_count: RefCount,
event_loop_timer: EventLoopTimer = .{
    .next = .epoch,
    .tag = .ImmediateObject,
},
internals: TimerObjectInternals,

pub fn init(
    globalThis: *JSGlobalObject,
    id: i32,
    callback: JSValue,
    arguments: JSValue,
) JSValue {
    // internals are initialized by init()
    const immediate = fun.new(Self, .{ .ref_count = .init(), .internals = undefined });
    const js_value = immediate.toJS(globalThis);
    defer js_value.ensureStillAlive();
    immediate.internals.init(
        js_value,
        globalThis,
        id,
        .setImmediate,
        0,
        callback,
        arguments,
    );

    if (globalThis.funVM().isInspectorEnabled()) {
        Debugger.didScheduleAsyncCall(
            globalThis,
            .DOMTimer,
            ID.asyncID(.{ .id = id, .kind = .setImmediate }),
            true,
        );
    }

    return js_value;
}

fn deinit(self: *Self) void {
    self.internals.deinit();
    fun.destroy(self);
}

pub fn constructor(globalObject: *jsc.JSGlobalObject, callFrame: *jsc.CallFrame) !*Self {
    _ = callFrame;
    return globalObject.throw("Immediate is not constructible", .{});
}

/// returns true if an exception was thrown
pub fn runImmediateTask(self: *Self, vm: *VirtualMachine) bool {
    return self.internals.runImmediateTask(vm);
}

pub fn toPrimitive(self: *Self, _: *jsc.JSGlobalObject, _: *jsc.CallFrame) fun.JSError!JSValue {
    return self.internals.toPrimitive();
}

pub fn doRef(self: *Self, globalThis: *JSGlobalObject, callFrame: *jsc.CallFrame) fun.JSError!JSValue {
    return self.internals.doRef(globalThis, callFrame.this());
}

pub fn doUnref(self: *Self, globalThis: *JSGlobalObject, callFrame: *jsc.CallFrame) fun.JSError!JSValue {
    return self.internals.doUnref(globalThis, callFrame.this());
}

pub fn hasRef(self: *Self, _: *JSGlobalObject, _: *jsc.CallFrame) fun.JSError!JSValue {
    return self.internals.hasRef();
}

pub fn finalize(self: *Self) void {
    self.internals.finalize();
}

pub fn getDestroyed(self: *Self, globalThis: *JSGlobalObject) JSValue {
    _ = globalThis;
    return .jsBoolean(self.internals.getDestroyed());
}

pub fn dispose(self: *Self, globalThis: *JSGlobalObject, _: *jsc.CallFrame) fun.JSError!JSValue {
    self.internals.cancel(globalThis.funVM());
    return .js_undefined;
}

const Debugger = @import("../../jsc/Debugger.zig");
const fun = @import("fun");

const EventLoopTimer = fun.api.Timer.EventLoopTimer;
const ID = fun.api.Timer.ID;
const TimerObjectInternals = fun.api.Timer.TimerObjectInternals;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
const VirtualMachine = jsc.VirtualMachine;
