extern fn ScriptExecutionContextIdentifier__getGlobalObject(id: u32) ?*fun.jsc.JSGlobalObject;

/// Safe handle to a JavaScript execution environment that may have exited.
/// Obtain with global_object.scriptExecutionContextIdentifier()
pub const Identifier = enum(u32) {
    _,

    /// Returns null if the context referred to by `self` no longer exists
    pub fn globalObject(self: Identifier) ?*fun.jsc.JSGlobalObject {
        return ScriptExecutionContextIdentifier__getGlobalObject(@intFromEnum(self));
    }

    /// Returns null if the context referred to by `self` no longer exists
    pub fn funVM(self: Identifier) ?*fun.jsc.VirtualMachine {
        // concurrently because we expect these identifiers are mostly used by off-thread tasks
        return (self.globalObject() orelse return null).funVMConcurrently();
    }

    pub fn valid(self: Identifier) bool {
        return self.globalObject() != null;
    }
};

const fun = @import("fun");
