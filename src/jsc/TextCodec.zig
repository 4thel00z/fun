extern fn Fun__createTextCodec(encodingName: [*]const u8, encodingNameLen: usize) ?*TextCodec;
extern fn Fun__decodeWithTextCodec(codec: *TextCodec, data: [*]const u8, length: usize, flush: bool, stopOnError: bool, outSawError: *bool) fun.String;
extern fn Fun__deleteTextCodec(codec: *TextCodec) void;
extern fn Fun__stripBOMFromTextCodec(codec: *TextCodec) void;
extern fn Fun__isEncodingSupported(encodingName: [*]const u8, encodingNameLen: usize) bool;
extern fn Fun__getCanonicalEncodingName(encodingName: [*]const u8, encodingNameLen: usize, outLen: *usize) ?[*]const u8;

pub const TextCodec = opaque {
    pub fn create(encoding: []const u8) ?*TextCodec {
        jsc.markBinding(@src());
        return Fun__createTextCodec(encoding.ptr, encoding.len);
    }

    pub fn deinit(self: *TextCodec) void {
        jsc.markBinding(@src());
        Fun__deleteTextCodec(self);
    }

    pub fn decode(self: *TextCodec, data: []const u8, flush: bool, stopOnError: bool) struct { result: fun.String, sawError: bool } {
        jsc.markBinding(@src());
        var sawError: bool = false;
        const result = Fun__decodeWithTextCodec(self, data.ptr, data.len, flush, stopOnError, &sawError);

        return .{ .result = result, .sawError = sawError };
    }

    pub fn stripBOM(self: *TextCodec) void {
        jsc.markBinding(@src());
        Fun__stripBOMFromTextCodec(self);
    }

    pub fn isSupported(encoding: []const u8) bool {
        jsc.markBinding(@src());
        return Fun__isEncodingSupported(encoding.ptr, encoding.len);
    }

    pub fn getCanonicalEncodingName(encoding: []const u8) ?[]const u8 {
        jsc.markBinding(@src());
        var len: usize = 0;
        const name = Fun__getCanonicalEncodingName(encoding.ptr, encoding.len, &len) orelse return null;
        return name[0..len];
    }
};

const fun = @import("fun");
const jsc = fun.jsc;
