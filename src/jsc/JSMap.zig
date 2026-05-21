/// Opaque type for working with JavaScript `Map` objects.
pub const JSMap = opaque {
    pub const create = fun.cpp.JSC__JSMap__create;
    pub const set = fun.cpp.JSC__JSMap__set;

    /// Retrieve a value from this JS Map object.
    ///
    /// Note this shares semantics with the JS `Map.prototype.get` method, and
    /// will return .js_undefined if a value is not found.
    pub const get = fun.cpp.JSC__JSMap__get;

    /// Test whether this JS Map object has a given key.
    pub const has = fun.cpp.JSC__JSMap__has;

    /// Attempt to remove a key from this JS Map object.
    pub const remove = fun.cpp.JSC__JSMap__remove;

    /// Clear all entries from this JS Map object.
    pub const clear = fun.cpp.JSC__JSMap__clear;

    /// Retrieve the number of entries in this JS Map object.
    pub const size = fun.cpp.JSC__JSMap__size;

    /// Attempt to convert a `JSValue` to a `*JSMap`.
    ///
    /// Returns `null` if the value is not a Map.
    pub fn fromJS(value: JSValue) ?*JSMap {
        if (value.jsTypeLoose() == .Map) {
            return fun.cast(*JSMap, value.asEncoded().asPtr.?);
        }

        return null;
    }
};

const fun = @import("fun");

const jsc = fun.jsc;
const JSValue = jsc.JSValue;
