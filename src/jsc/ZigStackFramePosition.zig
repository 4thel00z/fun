/// Represents a position in source code with line and column information
pub const ZigStackFramePosition = extern struct {
    line: fun.Ordinal,
    column: fun.Ordinal,
    /// -1 if not present
    line_start_byte: c_int,

    pub const invalid = ZigStackFramePosition{
        .line = .invalid,
        .column = .invalid,
        .line_start_byte = -1,
    };

    pub fn isInvalid(this: *const ZigStackFramePosition) bool {
        return std.mem.eql(u8, std.mem.asBytes(this), std.mem.asBytes(&invalid));
    }

    pub fn decode(reader: anytype) !@This() {
        return .{
            .line = fun.Ordinal.fromZeroBased(try reader.readValue(i32)),
            .column = fun.Ordinal.fromZeroBased(try reader.readValue(i32)),
        };
    }

    pub fn encode(this: *const @This(), writer: anytype) anyerror!void {
        try writer.writeInt(this.line.zeroBased());
        try writer.writeInt(this.column.zeroBased());
    }
};

const fun = @import("fun");
const std = @import("std");
