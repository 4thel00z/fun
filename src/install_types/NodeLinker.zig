//! Extracted from `install/PackageManager/PackageManagerOptions.zig` so
//! `options_types/schema.zig`, `cli/funfig.zig`, and `ini/` can name the
//! linker mode without depending on the full package manager.
pub const NodeLinker = enum(u8) {
    // If workspaces are used: isolated
    // If not: hoisted
    // Used when nodeLinker is absent from package.json/fun.lock/fun.lockb
    auto,

    hoisted,
    isolated,

    pub fn fromStr(input: []const u8) ?NodeLinker {
        if (strings.eqlComptime(input, "hoisted")) {
            return .hoisted;
        }
        if (strings.eqlComptime(input, "isolated")) {
            return .isolated;
        }
        return null;
    }
};

const fun = @import("fun");
const strings = fun.strings;
