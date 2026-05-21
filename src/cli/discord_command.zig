pub const DiscordCommand = struct {
    const discord_url = "https://fun.dev/discord";
    pub fn exec(_: std.mem.Allocator) !void {
        open.openURL(discord_url);
    }
};

const fun = @import("fun");
const open = @import("./open.zig");
const std = @import("std");
