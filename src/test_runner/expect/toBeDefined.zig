pub fn toBeDefined(this: *Expect, globalThis: *JSGlobalObject, callFrame: *CallFrame) fun.JSError!JSValue {
    defer this.postMatch(globalThis);

    const thisValue = callFrame.this();
    const value: JSValue = try this.getValue(globalThis, thisValue, "toBeDefined", "");

    this.incrementExpectCallCounter();

    const not = this.flags.not;
    var pass = !value.isUndefined();
    if (not) pass = !pass;
    if (pass) return .js_undefined;

    // handle failure
    var formatter = jsc.ConsoleObject.Formatter{ .globalThis = globalThis, .quote_strings = true };
    defer formatter.deinit();
    const value_fmt = value.toFmt(&formatter);
    if (not) {
        const received_line = "Received: <red>{f}<r>\n";
        const signature = comptime getSignature("toBeDefined", "", true);
        return this.throw(globalThis, signature, "\n\n" ++ received_line, .{value_fmt});
    }

    const received_line = "Received: <red>{f}<r>\n";
    const signature = comptime getSignature("toBeDefined", "", false);
    return this.throw(globalThis, signature, "\n\n" ++ received_line, .{value_fmt});
}

const fun = @import("fun");

const jsc = fun.jsc;
const CallFrame = fun.jsc.CallFrame;
const JSGlobalObject = fun.jsc.JSGlobalObject;
const JSValue = fun.jsc.JSValue;

const Expect = fun.jsc.Expect.Expect;
const getSignature = Expect.getSignature;
