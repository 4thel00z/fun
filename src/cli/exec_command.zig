pub const ExecCommand = struct {
    pub fn exec(ctx: Command.Context) !void {
        const script = ctx.positionals[1];
        // this is a hack: make dummy bundler so we can use its `.runEnvLoader()` function to populate environment variables probably should split out the functionality
        var bundle = try fun.Transpiler.init(
            ctx.allocator,
            ctx.log,
            try @import("../jsc/config.zig").configureTransformOptionsForFunVM(ctx.allocator, ctx.args),
            null,
        );
        try bundle.runEnvLoader(bundle.options.env.disable_default_env_files);
        var buf: fun.PathBuffer = undefined;
        const cwd = switch (fun.sys.getcwd(&buf)) {
            .result => |p| p,
            .err => |e| {
                Output.err(e, "failed to run script <b>{s}<r>", .{script});
                Global.exit(1);
            },
        };
        const mini = fun.jsc.MiniEventLoop.initGlobal(bundle.env, cwd);
        const parts: []const []const u8 = &[_][]const u8{
            cwd,
            "[eval]",
        };
        const script_path = fun.path.join(parts, .auto);

        const code = fun.shell.Interpreter.initAndRunFromSource(ctx, mini, script_path, script, null) catch |err| {
            Output.err(err, "failed to run script <b>{s}<r>", .{script_path});
            Global.exit(1);
        };

        // if (code > 0) {
        //     if (code != 2 and !silent) {
        //         Output.prettyErrorln("<r><red>error<r><d>:<r> script <b>\"{s}\"<r> exited with code {d}<r>", .{ name, code });
        //         Output.flush();
        //     }

        Global.exit(code);
        // }
    }
};

const fun = @import("fun");
const Global = fun.Global;
const Output = fun.Output;
const Command = fun.cli.Command;
