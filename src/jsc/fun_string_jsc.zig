//! JSC bridges for `fun.String` and `SliceWithUnderlyingString`. Keeps
//! `src/string/` free of `JSValue`/`JSGlobalObject`/`CallFrame` types — the
//! original methods are aliased to the free fns here.

// ── extern decls ────────────────────────────────────────────────────────────
extern fn FunString__transferToJS(this: *String, globalThis: *jsc.JSGlobalObject) jsc.JSValue;
extern fn FunString__toJS(globalObject: *jsc.JSGlobalObject, in: *const String) jsc.JSValue;
extern fn FunString__toJSWithLength(globalObject: *jsc.JSGlobalObject, in: *const String, usize) jsc.JSValue;
extern fn FunString__toJSDOMURL(globalObject: *jsc.JSGlobalObject, in: *String) jsc.JSValue;
extern fn FunString__createArray(globalObject: *jsc.JSGlobalObject, ptr: [*]const String, len: usize) jsc.JSValue;
extern fn JSC__createError(*jsc.JSGlobalObject, str: *const String) jsc.JSValue;
extern fn JSC__createTypeError(*jsc.JSGlobalObject, str: *const String) jsc.JSValue;
extern fn JSC__createRangeError(*jsc.JSGlobalObject, str: *const String) jsc.JSValue;

// ── fun.String methods ──────────────────────────────────────────────────────
pub fn transferToJS(this: *String, globalThis: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    jsc.markBinding(@src());
    return fun.jsc.fromJSHostCall(globalThis, @src(), FunString__transferToJS, .{ this, globalThis });
}

pub fn toErrorInstance(this: *const String, globalObject: *jsc.JSGlobalObject) jsc.JSValue {
    defer this.deref();
    return JSC__createError(globalObject, this);
}

pub fn toTypeErrorInstance(this: *const String, globalObject: *jsc.JSGlobalObject) jsc.JSValue {
    defer this.deref();
    return JSC__createTypeError(globalObject, this);
}

pub fn toRangeErrorInstance(this: *const String, globalObject: *jsc.JSGlobalObject) jsc.JSValue {
    defer this.deref();
    return JSC__createRangeError(globalObject, this);
}

pub fn fromJS(value: fun.jsc.JSValue, globalObject: *jsc.JSGlobalObject) fun.JSError!String {
    var scope: jsc.ExceptionValidationScope = undefined;
    scope.init(globalObject, @src());
    defer scope.deinit();
    var out: String = String.dead;
    const ok = fun.cpp.FunString__fromJS(globalObject, value, &out);

    // If there is a pending exception, but stringifying succeeds, we don't return JSError.
    // We do need to always call hasException() to satisfy the need for an exception check.
    const has_exception = scope.hasExceptionOrFalseWhenAssertionsAreDisabled();
    if (ok) {
        fun.debugAssert(out.tag != .Dead);
    } else {
        fun.debugAssert(has_exception);
    }

    return if (ok) out else error.JSError;
}

pub fn toJS(this: *const String, globalObject: *fun.jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    jsc.markBinding(@src());
    return fun.jsc.fromJSHostCall(globalObject, @src(), FunString__toJS, .{ globalObject, this });
}

pub fn toJSDOMURL(this: *String, globalObject: *fun.jsc.JSGlobalObject) jsc.JSValue {
    jsc.markBinding(@src());
    return FunString__toJSDOMURL(globalObject, this);
}

/// calls toJS on all elements of `array`.
pub fn toJSArray(globalObject: *fun.jsc.JSGlobalObject, array: []const fun.String) fun.JSError!jsc.JSValue {
    jsc.markBinding(@src());
    return fun.jsc.fromJSHostCall(globalObject, @src(), FunString__createArray, .{ globalObject, array.ptr, array.len });
}

pub fn toJSByParseJSON(self: *String, globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    return fun.cpp.FunString__toJSON(globalObject, self);
}

pub fn createUTF8ForJS(globalObject: *jsc.JSGlobalObject, utf8_slice: []const u8) fun.JSError!jsc.JSValue {
    jsc.markBinding(@src());
    return fun.cpp.FunString__createUTF8ForJS(globalObject, utf8_slice.ptr, utf8_slice.len);
}

pub fn createFormatForJS(globalObject: *jsc.JSGlobalObject, comptime fmt: [:0]const u8, args: anytype) fun.JSError!jsc.JSValue {
    jsc.markBinding(@src());
    var builder = std.array_list.Managed(u8).init(fun.default_allocator);
    defer builder.deinit();
    fun.handleOom(builder.writer().print(fmt, args));
    return fun.cpp.FunString__createUTF8ForJS(globalObject, builder.items.ptr, builder.items.len);
}

pub fn parseDate(this: *String, globalObject: *jsc.JSGlobalObject) fun.JSError!f64 {
    jsc.markBinding(@src());
    return fun.cpp.Fun__parseDate(globalObject, this);
}

pub fn jsGetStringWidth(globalObject: *jsc.JSGlobalObject, callFrame: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const args = callFrame.argumentsAsArray(2);
    const argument = args[0];
    const opts_val = args[1];

    if (argument == .zero or argument.isUndefined()) {
        return .jsNumber(@as(i32, 0));
    }

    const js_str = try argument.toJSString(globalObject);
    const view = js_str.view(globalObject);

    if (view.isEmpty()) {
        return .jsNumber(@as(i32, 0));
    }

    const str = fun.String.init(view);

    // Parse options: { countAnsiEscapeCodes?: bool, ambiguousIsNarrow?: bool }
    var count_ansi: bool = false;
    var ambiguous_is_narrow: bool = true;

    if (opts_val.isObject()) {
        if (try opts_val.getTruthyComptime(globalObject, "countAnsiEscapeCodes")) |v| {
            count_ansi = v.toBoolean();
        }
        if (try opts_val.getTruthyComptime(globalObject, "ambiguousIsNarrow")) |v| {
            ambiguous_is_narrow = v.toBoolean();
        }
    }

    const width = if (count_ansi)
        str.visibleWidth(!ambiguous_is_narrow)
    else
        str.visibleWidthExcludeANSIColors(!ambiguous_is_narrow);

    return .jsNumber(width);
}

// ── SliceWithUnderlyingString methods ───────────────────────────────────────
pub fn sliceWithUnderlyingStringToJS(this: *SliceWithUnderlyingString, globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    return sliceWithUnderlyingStringToJSWithOptions(this, globalObject, false);
}

pub fn sliceWithUnderlyingStringTransferToJS(this: *SliceWithUnderlyingString, globalObject: *jsc.JSGlobalObject) fun.JSError!jsc.JSValue {
    return sliceWithUnderlyingStringToJSWithOptions(this, globalObject, true);
}

fn sliceWithUnderlyingStringToJSWithOptions(this: *SliceWithUnderlyingString, globalObject: *jsc.JSGlobalObject, transfer: bool) fun.JSError!jsc.JSValue {
    if ((this.underlying.tag == .Dead or this.underlying.tag == .Empty) and this.utf8.length() > 0) {
        if (comptime fun.Environment.allow_assert) {
            if (this.utf8.allocator.get()) |allocator| {
                fun.assert(!String.isWTFAllocator(allocator)); // We should never enter this state.
            }
        }

        if (this.utf8.allocator.get()) |_| {
            if (fun.strings.toUTF16Alloc(fun.default_allocator, this.utf8.slice(), false, false) catch null) |utf16| {
                this.utf8.deinit();
                this.utf8 = .{};
                return jsc.ZigString.toExternalU16(utf16.ptr, utf16.len, globalObject);
            } else {
                const js_value = ZigString.init(this.utf8.slice()).toExternalValue(
                    globalObject,
                );
                this.utf8 = .{};
                return js_value;
            }
        }

        defer {
            if (transfer) {
                this.utf8.deinit();
                this.utf8 = .{};
            }
        }

        return String.createUTF8ForJS(globalObject, this.utf8.slice());
    }

    if (transfer) {
        this.utf8.deinit();
        this.utf8 = .{};
        return this.underlying.transferToJS(globalObject);
    } else {
        return this.underlying.toJS(globalObject);
    }
}

// ── escapeRegExp host fns ───────────────────────────────────────────────────
pub fn jsEscapeRegExp(global: *jsc.JSGlobalObject, call_frame: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const input_value = call_frame.argument(0);

    if (!input_value.isString()) {
        return global.throw("expected string argument", .{});
    }

    var input = try input_value.toSlice(global, fun.default_allocator);
    defer input.deinit();

    var buf = std.Io.Writer.Allocating.init(fun.default_allocator);
    defer buf.deinit();

    fun.strings.escapeRegExp(input.slice(), &buf.writer) catch |e| switch (e) {
        error.WriteFailed => return error.OutOfMemory, // Writer.Allocating can only fail with OutOfMemory
    };

    var output = String.cloneUTF8(buf.written());

    return output.toJS(global);
}

pub fn jsEscapeRegExpForPackageNameMatching(global: *jsc.JSGlobalObject, call_frame: *jsc.CallFrame) fun.JSError!jsc.JSValue {
    const input_value = call_frame.argument(0);

    if (!input_value.isString()) {
        return global.throw("expected string argument", .{});
    }

    var input = try input_value.toSlice(global, fun.default_allocator);
    defer input.deinit();

    var buf = std.Io.Writer.Allocating.init(fun.default_allocator);
    defer buf.deinit();

    fun.strings.escapeRegExpForPackageNameMatching(input.slice(), &buf.writer) catch |e| switch (e) {
        error.WriteFailed => return error.OutOfMemory, // Writer.Allocating can only fail with OutOfMemory
    };

    var output = String.cloneUTF8(buf.written());

    return output.toJS(global);
}

// ── unicode TestingAPIs ─────────────────────────────────────────────────────
pub const UnicodeTestingAPIs = struct {
    /// Used in JS tests, see `internal-for-testing.ts`.
    /// Exercises the `sentinel = true` path of `toUTF16AllocForReal`, which is
    /// otherwise only reachable from Windows-only code (`fun build --compile`
    /// metadata in `src/windows.zig`).
    pub fn toUTF16AllocSentinel(globalThis: *fun.jsc.JSGlobalObject, callframe: *fun.jsc.CallFrame) fun.JSError!fun.jsc.JSValue {
        const arguments = callframe.arguments();
        if (arguments.len < 1) {
            return globalThis.throw("toUTF16AllocSentinel: expected 1 argument", .{});
        }
        const array_buffer = arguments[0].asArrayBuffer(globalThis) orelse {
            return globalThis.throw("toUTF16AllocSentinel: expected a Uint8Array", .{});
        };
        const bytes = array_buffer.byteSlice();

        const allocator = fun.default_allocator;
        const result = strings.toUTF16AllocForReal(allocator, bytes, false, true) catch |err| {
            return globalThis.throwError(err, "toUTF16AllocForReal failed");
        };
        defer allocator.free(result);

        fun.assert(result.ptr[result.len] == 0);

        var out = fun.String.cloneUTF16(result);
        defer out.deref();
        return out.toJS(globalThis);
    }
};

const std = @import("std");

const fun = @import("fun");
const SliceWithUnderlyingString = fun.SliceWithUnderlyingString;
const String = fun.String;
const strings = fun.strings;

const jsc = fun.jsc;
const ZigString = fun.jsc.ZigString;
