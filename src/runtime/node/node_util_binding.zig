pub fn internalErrorName(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const arguments = callframe.arguments_old(1).slice();
    if (arguments.len < 1) {
        return globalThis.throwNotEnoughArguments("internalErrorName", 1, arguments.len);
    }

    const err_value = arguments[0];
    const err_int = err_value.toInt32();

    if (err_int == -4095) return fun.String.static("EOF").toJS(globalThis);
    if (err_int == -4094) return fun.String.static("UNKNOWN").toJS(globalThis);
    if (err_int == -3000) return fun.String.static("EAI_ADDRFAMILY").toJS(globalThis);
    if (err_int == -3001) return fun.String.static("EAI_AGAIN").toJS(globalThis);
    if (err_int == -3002) return fun.String.static("EAI_BADFLAGS").toJS(globalThis);
    if (err_int == -3003) return fun.String.static("EAI_CANCELED").toJS(globalThis);
    if (err_int == -3004) return fun.String.static("EAI_FAIL").toJS(globalThis);
    if (err_int == -3005) return fun.String.static("EAI_FAMILY").toJS(globalThis);
    if (err_int == -3006) return fun.String.static("EAI_MEMORY").toJS(globalThis);
    if (err_int == -3007) return fun.String.static("EAI_NODATA").toJS(globalThis);
    if (err_int == -3008) return fun.String.static("EAI_NONAME").toJS(globalThis);
    if (err_int == -3009) return fun.String.static("EAI_OVERFLOW").toJS(globalThis);
    if (err_int == -3010) return fun.String.static("EAI_SERVICE").toJS(globalThis);
    if (err_int == -3011) return fun.String.static("EAI_SOCKTYPE").toJS(globalThis);
    if (err_int == -3013) return fun.String.static("EAI_BADHINTS").toJS(globalThis);
    if (err_int == -3014) return fun.String.static("EAI_PROTOCOL").toJS(globalThis);

    if (err_int == -fun.sys.UV_E.@"2BIG") return fun.String.static("E2BIG").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ACCES) return fun.String.static("EACCES").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ADDRINUSE) return fun.String.static("EADDRINUSE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ADDRNOTAVAIL) return fun.String.static("EADDRNOTAVAIL").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.AFNOSUPPORT) return fun.String.static("EAFNOSUPPORT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.AGAIN) return fun.String.static("EAGAIN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ALREADY) return fun.String.static("EALREADY").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.BADF) return fun.String.static("EBADF").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.BUSY) return fun.String.static("EBUSY").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.CANCELED) return fun.String.static("ECANCELED").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.CHARSET) return fun.String.static("ECHARSET").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.CONNABORTED) return fun.String.static("ECONNABORTED").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.CONNREFUSED) return fun.String.static("ECONNREFUSED").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.CONNRESET) return fun.String.static("ECONNRESET").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.DESTADDRREQ) return fun.String.static("EDESTADDRREQ").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.EXIST) return fun.String.static("EEXIST").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.FAULT) return fun.String.static("EFAULT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.HOSTUNREACH) return fun.String.static("EHOSTUNREACH").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.INTR) return fun.String.static("EINTR").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.INVAL) return fun.String.static("EINVAL").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.IO) return fun.String.static("EIO").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ISCONN) return fun.String.static("EISCONN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ISDIR) return fun.String.static("EISDIR").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.LOOP) return fun.String.static("ELOOP").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.MFILE) return fun.String.static("EMFILE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.MSGSIZE) return fun.String.static("EMSGSIZE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NAMETOOLONG) return fun.String.static("ENAMETOOLONG").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NETDOWN) return fun.String.static("ENETDOWN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NETUNREACH) return fun.String.static("ENETUNREACH").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NFILE) return fun.String.static("ENFILE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOBUFS) return fun.String.static("ENOBUFS").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NODEV) return fun.String.static("ENODEV").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOENT) return fun.String.static("ENOENT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOMEM) return fun.String.static("ENOMEM").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NONET) return fun.String.static("ENONET").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOSPC) return fun.String.static("ENOSPC").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOSYS) return fun.String.static("ENOSYS").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTCONN) return fun.String.static("ENOTCONN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTDIR) return fun.String.static("ENOTDIR").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTEMPTY) return fun.String.static("ENOTEMPTY").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTSOCK) return fun.String.static("ENOTSOCK").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTSUP) return fun.String.static("ENOTSUP").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.PERM) return fun.String.static("EPERM").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.PIPE) return fun.String.static("EPIPE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.PROTO) return fun.String.static("EPROTO").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.PROTONOSUPPORT) return fun.String.static("EPROTONOSUPPORT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.PROTOTYPE) return fun.String.static("EPROTOTYPE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ROFS) return fun.String.static("EROFS").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.SHUTDOWN) return fun.String.static("ESHUTDOWN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.SPIPE) return fun.String.static("ESPIPE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.SRCH) return fun.String.static("ESRCH").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.TIMEDOUT) return fun.String.static("ETIMEDOUT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.TXTBSY) return fun.String.static("ETXTBSY").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.XDEV) return fun.String.static("EXDEV").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.FBIG) return fun.String.static("EFBIG").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOPROTOOPT) return fun.String.static("ENOPROTOOPT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.RANGE) return fun.String.static("ERANGE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NXIO) return fun.String.static("ENXIO").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.MLINK) return fun.String.static("EMLINK").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.HOSTDOWN) return fun.String.static("EHOSTDOWN").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.REMOTEIO) return fun.String.static("EREMOTEIO").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOTTY) return fun.String.static("ENOTTY").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.FTYPE) return fun.String.static("EFTYPE").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.ILSEQ) return fun.String.static("EILSEQ").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.OVERFLOW) return fun.String.static("EOVERFLOW").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.SOCKTNOSUPPORT) return fun.String.static("ESOCKTNOSUPPORT").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NODATA) return fun.String.static("ENODATA").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.UNATCH) return fun.String.static("EUNATCH").toJS(globalThis);
    if (err_int == -fun.sys.UV_E.NOEXEC) return fun.String.static("ENOEXEC").toJS(globalThis);

    var fmtstring = fun.handleOom(fun.String.createFormat("Unknown system error {d}", .{err_int}));
    return fmtstring.transferToJS(globalThis);
}

pub fn etimedoutErrorCode(_: *jsc.JSGlobalObject, _: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    return jsc.JSValue.jsNumberFromInt32(-fun.sys.UV_E.TIMEDOUT);
}

pub fn enobufsErrorCode(_: *jsc.JSGlobalObject, _: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    return jsc.JSValue.jsNumberFromInt32(-fun.sys.UV_E.NOBUFS);
}

/// `extractedSplitNewLines` for ASCII/Latin1 strings. Panics if passed a non-string.
/// Returns `undefined` if param is utf8 or utf16 and not fully ascii.
///
/// ```js
/// // util.js
/// const extractedNewLineRe = new RegExp("(?<=\\n)");
/// extractedSplitNewLines = value => RegExpPrototypeSymbolSplit(extractedNewLineRe, value);
/// ```
pub fn extractedSplitNewLinesFastPathStringsOnly(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    fun.assert(callframe.argumentsCount() == 1);
    const value = callframe.argument(0);
    fun.assert(value.isString());

    const str = try value.toFunString(globalThis);
    defer str.deref();

    return switch (str.encoding()) {
        inline .utf16, .latin1 => |encoding| split(encoding, globalThis, fun.default_allocator, &str),
        .utf8 => if (fun.strings.isAllASCII(str.byteSlice()))
            return split(.utf8, globalThis, fun.default_allocator, &str)
        else
            return .js_undefined,
    };
}

fn split(
    comptime encoding: fun.strings.EncodingNonAscii,
    globalThis: *jsc.JSGlobalObject,
    allocator: Allocator,
    str: *const fun.String,
) fun.JSError!jsc.JSValue {
    var fallback = std.heap.stackFallback(1024, allocator);
    const alloc = fallback.get();
    const Char = switch (encoding) {
        .utf8, .latin1 => u8,
        .utf16 => u16,
    };

    var lines: std.ArrayListUnmanaged(fun.String) = .{};
    defer {
        for (lines.items) |out| {
            out.deref();
        }
        lines.deinit(alloc);
    }

    const buffer: []const Char = if (encoding == .utf16)
        str.utf16()
    else
        str.byteSlice();
    var it: SplitNewlineIterator(Char) = .{ .buffer = buffer, .index = 0 };
    while (it.next()) |line| {
        const encoded_line = switch (encoding) {
            inline .utf8 => fun.String.borrowUTF8(line),
            inline .latin1 => fun.String.cloneLatin1(line),
            inline .utf16 => fun.String.borrowUTF16(line),
        };
        errdefer encoded_line.deref();
        try lines.append(alloc, encoded_line);
    }

    return fun.String.toJSArray(globalThis, lines.items);
}

pub fn SplitNewlineIterator(comptime T: type) type {
    return struct {
        buffer: []const T,
        index: ?usize,

        const Self = @This();

        /// Returns a slice of the next field, or null if splitting is complete.
        pub fn next(self: *Self) ?[]const T {
            const start = self.index orelse return null;

            if (std.mem.indexOfScalarPos(T, self.buffer, start, '\n')) |delim_start| {
                const end = delim_start + 1;
                const slice = self.buffer[start..end];
                self.index = end;
                return slice;
            } else {
                self.index = null;
                return self.buffer[start..];
            }
        }
    };
}

pub fn normalizeEncoding(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const input = callframe.argument(0);
    const str = try fun.String.fromJS(input, globalThis);
    fun.assert(str.tag != .Dead);
    defer str.deref();
    if (str.length() == 0) return jsc.Node.Encoding.utf8.toJS(globalThis);
    if (str.inMapCaseInsensitive(jsc.Node.Encoding.map)) |enc| return enc.toJS(globalThis);
    return .js_undefined;
}

pub fn parseEnv(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const content = callframe.argument(0);
    try validators.validateString(globalThis, content, "content", .{});

    var arena = std.heap.ArenaAllocator.init(fun.default_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    const str = content.asString().toSlice(globalThis, allocator);

    var map = envloader.Map.init(allocator);
    var p = envloader.Loader.init(&map, allocator);
    try p.loadFromString(str.slice(), true, false);

    var obj = jsc.JSValue.createEmptyObject(globalThis, map.map.count());
    for (map.map.keys(), map.map.values()) |k, v| {
        obj.put(globalThis, jsc.ZigString.initUTF8(k), try fun.String.createUTF8ForJS(globalThis, v.value));
    }
    return obj;
}

const string = []const u8;

const fun = @import("fun");
const envloader = @import("../../dotenv/env_loader.zig");
const std = @import("std");
const validators = @import("./util/validators.zig");
const Allocator = std.mem.Allocator;

const jsc = fun.jsc;
const ZigString = jsc.ZigString;
