const CommandComplete = @This();

command_tag: Data = .{ .empty = {} },

pub fn deinit(this: *@This()) void {
    this.command_tag.deinit();
}

pub fn decodeInternal(this: *@This(), comptime Container: type, reader: NewReader(Container)) !void {
    const length = try reader.length();
    fun.assert(length >= 4);

    const tag = try reader.readZ();
    this.* = .{
        .command_tag = tag,
    };
}

pub const decode = DecoderWrap(CommandComplete, decodeInternal).decode;

const fun = @import("fun");
const Data = @import("../../shared/Data.zig").Data;
const DecoderWrap = @import("./DecoderWrap.zig").DecoderWrap;
const NewReader = @import("./NewReader.zig").NewReader;
