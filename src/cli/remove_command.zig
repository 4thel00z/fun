pub const RemoveCommand = struct {
    pub fn exec(ctx: Command.Context) !void {
        try updatePackageJSONAndInstallCatchError(ctx, .remove);
    }
};

const fun = @import("fun");
const Command = fun.cli.Command;

const PackageManager = fun.install.PackageManager;
const updatePackageJSONAndInstallCatchError = PackageManager.updatePackageJSONAndInstallCatchError;
