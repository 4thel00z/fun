pub const UpdateCommand = struct {
    pub fn exec(ctx: Command.Context) !void {
        const cli = try PackageManager.CommandLineArguments.parse(ctx.allocator, .update);

        if (cli.interactive) {
            const UpdateInteractiveCommand = @import("./update_interactive_command.zig").UpdateInteractiveCommand;
            try UpdateInteractiveCommand.exec(ctx);
        } else {
            try updatePackageJSONAndInstallCatchError(ctx, .update);
        }
    }
};

const fun = @import("fun");
const Command = fun.cli.Command;

const PackageManager = fun.install.PackageManager;
const updatePackageJSONAndInstallCatchError = PackageManager.updatePackageJSONAndInstallCatchError;
