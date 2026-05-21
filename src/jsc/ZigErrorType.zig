pub const ZigErrorType = extern struct {
    code: ErrorCode,
    value: fun.jsc.JSValue,
};

const fun = @import("fun");
const ErrorCode = @import("./ErrorCode.zig").ErrorCode;
