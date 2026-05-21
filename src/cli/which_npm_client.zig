pub const NPMClient = struct {
    bin: string,
    tag: Tag,

    pub const Tag = enum {
        fun,
    };
};

const string = []const u8;

const fun = @import("fun");
