//! JS testing bindings for `InternalSourceMap`. Keeps `src/sourcemap/` free of JSC types.

pub const TestingAPIs = struct {
    pub fn fromVLQ(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
        const vlq_str = try callframe.argument(0).toFunString(globalThis);
        defer vlq_str.deref();
        const vlq = vlq_str.toUTF8(fun.default_allocator);
        defer vlq.deinit();

        const blob = InternalSourceMap.fromVLQ(fun.default_allocator, vlq.slice(), 0) catch {
            return globalThis.throw("InternalSourceMap.fromVLQ: invalid VLQ input", .{});
        };
        defer fun.default_allocator.free(blob);
        return jsc.ArrayBuffer.createUint8Array(globalThis, blob);
    }

    pub fn toVLQ(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
        const ab = callframe.argument(0).asArrayBuffer(globalThis) orelse {
            return globalThis.throw("InternalSourceMap.toVLQ: expected Uint8Array", .{});
        };
        const bytes = ab.byteSlice();
        if (!InternalSourceMap.isValidBlob(bytes)) {
            return globalThis.throw("InternalSourceMap.toVLQ: invalid blob", .{});
        }
        const ism = InternalSourceMap{ .data = bytes.ptr };
        var out = MutableString.initEmpty(fun.default_allocator);
        defer out.deinit();
        ism.appendVLQTo(&out);
        return fun.String.createUTF8ForJS(globalThis, out.list.items);
    }

    pub fn find(globalThis: *jsc.JSGlobalObject, callframe: *jsc.CallFrame) fun.JSError!jsc.JSValue {
        const ab = callframe.argument(0).asArrayBuffer(globalThis) orelse {
            return globalThis.throw("InternalSourceMap.find: expected Uint8Array", .{});
        };
        const bytes = ab.byteSlice();
        if (!InternalSourceMap.isValidBlob(bytes)) {
            return globalThis.throw("InternalSourceMap.find: invalid blob", .{});
        }
        const line = callframe.argument(1).toInt32();
        const col = callframe.argument(2).toInt32();
        if (line < 0 or col < 0) return .null;
        const ism = InternalSourceMap{ .data = bytes.ptr };
        const mapping = ism.find(.fromZeroBased(line), .fromZeroBased(col)) orelse return .null;

        const obj = jsc.JSValue.createEmptyObject(globalThis, 5);
        obj.put(globalThis, jsc.ZigString.static("generatedLine"), .jsNumber(mapping.generated.lines.zeroBased()));
        obj.put(globalThis, jsc.ZigString.static("generatedColumn"), .jsNumber(mapping.generated.columns.zeroBased()));
        obj.put(globalThis, jsc.ZigString.static("originalLine"), .jsNumber(mapping.original.lines.zeroBased()));
        obj.put(globalThis, jsc.ZigString.static("originalColumn"), .jsNumber(mapping.original.columns.zeroBased()));
        obj.put(globalThis, jsc.ZigString.static("sourceIndex"), .jsNumber(mapping.source_index));
        return obj;
    }
};

const fun = @import("fun");
const MutableString = fun.MutableString;
const jsc = fun.jsc;
const InternalSourceMap = fun.SourceMap.InternalSourceMap;
