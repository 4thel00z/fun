//! parse dependency of positional arg string (may include name@version for example)
//! get the precise version from the lockfile (there may be multiple)
//! copy the contents into a temp folder

pub const PatchCommand = struct {
    pub fn exec(ctx: Command.Context) !void {
        try updatePackageJSONAndInstallCatchError(ctx, .patch);
    }
};

const string = []const u8;

const fun = @import("fun");
const Command = fun.cli.Command;

const PackageManager = fun.install.PackageManager;
const updatePackageJSONAndInstallCatchError = PackageManager.updatePackageJSONAndInstallCatchError;
