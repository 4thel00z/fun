/// value = not called yet. null = done already called, no-op.
ref: ?*fun_test.FunTest.RefData,
called: bool = false,

pub const js = jsc.Codegen.JSDoneCallback;
pub const toJS = js.toJS;
pub const fromJS = js.fromJS;

pub fn finalize(
    this: *DoneCallback,
) callconv(.c) void {
    groupLog.begin(@src());
    defer groupLog.end();

    if (this.ref) |ref| ref.deref();
    VirtualMachine.get().allocator.destroy(this);
}

pub fn createUnbound(globalThis: *JSGlobalObject) JSValue {
    groupLog.begin(@src());
    defer groupLog.end();

    var done_callback = fun.handleOom(globalThis.funVM().allocator.create(DoneCallback));
    done_callback.* = .{ .ref = null };

    const value = done_callback.toJS(globalThis);
    value.ensureStillAlive();
    return value;
}

pub fn bind(value: JSValue, globalThis: *JSGlobalObject) fun.JSError!JSValue {
    const callFn = jsc.JSFunction.create(globalThis, "done", FunTest.funTestDoneCallback, 1, .{});
    return try callFn.bind(globalThis, value, &fun.String.static("done"), 1, &.{});
}

const fun = @import("fun");

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
const VirtualMachine = jsc.VirtualMachine;

const fun_test = jsc.Jest.fun_test;
const FunTest = fun_test.FunTest;
const DoneCallback = fun_test.DoneCallback;
const groupLog = fun_test.debug.group;
