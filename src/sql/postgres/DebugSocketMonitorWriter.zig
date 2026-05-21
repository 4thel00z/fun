var file: std.fs.File = undefined;
pub var enabled = false;
pub var check = std.once(load);

pub fn write(data: []const u8) void {
    file.writeAll(data) catch {};
}

pub fn load() void {
    if (fun.env_var.FUN_POSTGRES_SOCKET_MONITOR.get()) |monitor| {
        enabled = true;
        file = std.fs.cwd().createFile(monitor, .{ .truncate = true }) catch {
            enabled = false;
            return;
        };
        debug("writing to {s}", .{monitor});
    }
}

const debug = fun.Output.scoped(.Postgres, .visible);

const fun = @import("fun");
const std = @import("std");
