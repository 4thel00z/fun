pub const JSArray = opaque {
    // TODO(@paperclover): this can throw
    extern fn JSArray__constructArray(*JSGlobalObject, [*]const JSValue, usize) JSValue;

    pub fn create(global: *JSGlobalObject, items: []const JSValue) fun.JSError!JSValue {
        return fun.jsc.fromJSHostCall(global, @src(), JSArray__constructArray, .{ global, items.ptr, items.len });
    }

    extern fn JSArray__constructEmptyArray(*JSGlobalObject, usize) JSValue;

    pub fn createEmpty(global: *JSGlobalObject, len: usize) fun.JSError!JSValue {
        return fun.jsc.fromJSHostCall(global, @src(), JSArray__constructEmptyArray, .{ global, len });
    }

    pub fn iterator(array: *JSArray, global: *JSGlobalObject) fun.JSError!JSArrayIterator {
        return JSValue.fromCell(array).arrayIterator(global);
    }
};

const fun = @import("fun");
const JSArrayIterator = @import("./JSArrayIterator.zig").JSArrayIterator;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
