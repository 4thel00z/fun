pub const JSArrayIterator = struct {
    i: u32 = 0,
    len: u32 = 0,
    array: JSValue,
    global: *JSGlobalObject,
    /// Direct pointer into the JSArray butterfly when the array has Int32 or
    /// Contiguous storage and a sane prototype chain. Holes are encoded as 0.
    fast: ?[*]const JSValue = null,

    pub fn init(value: JSValue, global: *JSGlobalObject) fun.JSError!JSArrayIterator {
        var length: u32 = 0;
        if (Fun__JSArray__getContiguousVector(value, &length)) |elements| {
            return .{
                .array = value,
                .global = global,
                .len = length,
                .fast = elements,
            };
        }
        return .{
            .array = value,
            .global = global,
            .len = @truncate(try value.getLength(global)),
        };
    }

    pub fn next(this: *JSArrayIterator) fun.JSError!?JSValue {
        if (!(this.i < this.len)) {
            return null;
        }
        const i = this.i;
        this.i += 1;
        if (this.fast) |elements| {
            if (Fun__JSArray__contiguousVectorIsStillValid(this.array, elements, this.len)) {
                const val = elements[i];
                return if (val == .zero) .js_undefined else val;
            }
            this.fast = null;
        }
        return try JSObject.getIndex(this.array, this.global, i);
    }

    extern fn Fun__JSArray__getContiguousVector(JSValue, *u32) ?[*]const JSValue;
    extern fn Fun__JSArray__contiguousVectorIsStillValid(JSValue, [*]const JSValue, u32) bool;
};

const fun = @import("fun");
const JSObject = @import("./JSObject.zig").JSObject;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
