/// Opaque representation of a JavaScript source provider
pub const SourceProvider = opaque {
    pub fn deref(provider: *SourceProvider) void {
        fun.cpp.JSC__SourceProvider__deref(provider);
    }
};

const fun = @import("fun");
