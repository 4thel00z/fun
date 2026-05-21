const CopyOutResponse = @This();

pub fn decodeInternal(this: *@This(), comptime Container: type, reader: NewReader(Container)) !void {
    _ = reader;
    _ = this;
    fun.Output.panic("TODO: not implemented {s}", .{fun.meta.typeBaseName(@typeName(@This()))});
}

pub const decode = DecoderWrap(CopyOutResponse, decodeInternal).decode;

const fun = @import("fun");
const DecoderWrap = @import("./DecoderWrap.zig").DecoderWrap;
const NewReader = @import("./NewReader.zig").NewReader;
