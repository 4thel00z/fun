pub fn toMatchSnapshot(this: *Expect, globalThis: *JSGlobalObject, callFrame: *CallFrame) fun.JSError!JSValue {
    defer this.postMatch(globalThis);
    const thisValue = callFrame.this();
    const _arguments = callFrame.arguments_old(2);
    const arguments: []const JSValue = _arguments.ptr[0.._arguments.len];

    this.incrementExpectCallCounter();

    const not = this.flags.not;
    if (not) {
        const signature = comptime getSignature("toMatchSnapshot", "", true);
        return this.throw(globalThis, signature, "\n\n<b>Matcher error<r>: Snapshot matchers cannot be used with <b>not<r>\n", .{});
    }

    var funtest_strong = this.funTest() orelse {
        const signature = comptime getSignature("toMatchSnapshot", "", true);
        return this.throw(globalThis, signature, "\n\n<b>Matcher error<r>: Snapshot matchers cannot be used outside of a test\n", .{});
    };
    defer funtest_strong.deinit();

    var hint_string: ZigString = ZigString.Empty;
    var property_matchers: ?JSValue = null;
    switch (arguments.len) {
        0 => {},
        1 => {
            if (arguments[0].isString()) {
                try arguments[0].toZigString(&hint_string, globalThis);
            } else if (arguments[0].isObject()) {
                property_matchers = arguments[0];
            } else {
                return this.throw(globalThis, "", "\n\nMatcher error: Expected first argument to be a string or object\n", .{});
            }
        },
        else => {
            if (!arguments[0].isObject()) {
                const signature = comptime getSignature("toMatchSnapshot", "<green>properties<r><d>, <r>hint", false);
                return this.throw(globalThis, signature, "\n\nMatcher error: Expected <green>properties<r> must be an object\n", .{});
            }

            property_matchers = arguments[0];

            if (arguments[1].isString()) {
                try arguments[1].toZigString(&hint_string, globalThis);
            } else {
                return this.throw(globalThis, "", "\n\nMatcher error: Expected second argument to be a string\n", .{});
            }
        },
    }

    var hint = hint_string.toSlice(default_allocator);
    defer hint.deinit();

    const value: JSValue = try this.getValue(globalThis, thisValue, "toMatchSnapshot", "<green>properties<r><d>, <r>hint");

    return this.snapshot(globalThis, value, property_matchers, hint.slice(), "toMatchSnapshot");
}

const fun = @import("fun");
const ZigString = fun.ZigString;
const default_allocator = fun.default_allocator;

const jsc = fun.jsc;
const CallFrame = fun.jsc.CallFrame;
const JSGlobalObject = fun.jsc.JSGlobalObject;
const JSValue = fun.jsc.JSValue;

const Expect = fun.jsc.Expect.Expect;
const getSignature = Expect.getSignature;
