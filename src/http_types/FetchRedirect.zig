pub const FetchRedirect = enum(u2) {
    follow,
    manual,
    @"error",

    pub const Map = fun.ComptimeStringMap(FetchRedirect, .{
        .{ "follow", .follow },
        .{ "manual", .manual },
        .{ "error", .@"error" },
    });
    pub const toJS = @import("../http_jsc/fetch_enums_jsc.zig").fetchRedirectToJS;
};

const fun = @import("fun");
