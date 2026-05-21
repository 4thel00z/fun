pub const CustomGetterSetter = opaque {
    pub fn isGetterNull(this: *CustomGetterSetter) bool {
        return fun.cpp.JSC__CustomGetterSetter__isGetterNull(this);
    }

    pub fn isSetterNull(this: *CustomGetterSetter) bool {
        return fun.cpp.JSC__CustomGetterSetter__isSetterNull(this);
    }
};

const fun = @import("fun");
