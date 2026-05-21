//! CommandTag.toJSTag / toJSNumber.

pub fn toJSTag(this: CommandTag, globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    return switch (this) {
        .INSERT => JSValue.jsNumber(1),
        .DELETE => JSValue.jsNumber(2),
        .UPDATE => JSValue.jsNumber(3),
        .MERGE => JSValue.jsNumber(4),
        .SELECT => JSValue.jsNumber(5),
        .MOVE => JSValue.jsNumber(6),
        .FETCH => JSValue.jsNumber(7),
        .COPY => JSValue.jsNumber(8),
        .other => |tag| fun.String.createUTF8ForJS(globalObject, tag),
    };
}

pub fn toJSNumber(this: CommandTag) JSValue {
    return switch (this) {
        .other => JSValue.jsNumber(0),
        inline else => |val| JSValue.jsNumber(val),
    };
}

const CommandTag = @import("../../sql/postgres/CommandTag.zig").CommandTag;

const fun = @import("fun");
const String = fun.String;

const jsc = fun.jsc;
const JSValue = jsc.JSValue;
