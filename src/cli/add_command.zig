pub const AddCommand = struct {
    pub fn exec(ctx: Command.Context) !void {
        try updatePackageJSONAndInstallCatchError(ctx, .add);
    }
};

const fun = @import("fun");
const Command = fun.cli.Command;

const PackageManager = fun.install.PackageManager;
const updatePackageJSONAndInstallCatchError = PackageManager.updatePackageJSONAndInstallCatchError;
