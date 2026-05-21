pub fn toJS(this: NoticeResponse, globalObject: *jsc.JSGlobalObject) JSValue {
    var b = fun.StringBuilder{};
    defer b.deinit(fun.default_allocator);

    for (this.messages.items) |msg| {
        b.cap += switch (msg) {
            inline else => |m| m.utf8ByteLength(),
        } + 1;
    }
    b.allocate(fun.default_allocator) catch {};

    for (this.messages.items) |msg| {
        var str = switch (msg) {
            inline else => |m| m.toUTF8(fun.default_allocator),
        };
        defer str.deinit();
        _ = b.append(str.slice());
        _ = b.append("\n");
    }

    return jsc.ZigString.init(b.allocatedSlice()[0..b.len]).toJS(globalObject);
}

const NoticeResponse = @import("../../../sql/postgres/protocol/NoticeResponse.zig");
const fun = @import("fun");

const jsc = fun.jsc;
const JSValue = jsc.JSValue;
