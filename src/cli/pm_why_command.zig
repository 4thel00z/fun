pub const PmWhyCommand = struct {
    pub fn exec(ctx: Command.Context, pm: *PackageManager, positionals: []const string) !void {
        try WhyCommand.execFromPm(ctx, pm, positionals);
    }
};

const string = []const u8;

const fun = @import("fun");
const WhyCommand = @import("./why_command.zig").WhyCommand;
const Command = fun.cli.Command;
const PackageManager = fun.install.PackageManager;
