pub const InstallCompletionsCommand = struct {
    pub fn testPath(_: string) !std.fs.Dir {}

    const funx_name = if (Environment.isDebug) "funx-debug" else "funx";

    fn installBunxSymlinkPosix(cwd: []const u8) !void {
        var buf: fun.PathBuffer = undefined;

        // don't install it if it's already there
        if (fun.which(&buf, fun.env_var.PATH.get() orelse cwd, cwd, funx_name) != null)
            return;

        // first try installing the symlink into the same directory as the fun executable
        const exe = try fun.selfExePath();
        var target_buf: fun.PathBuffer = undefined;
        var target = std.fmt.bufPrint(&target_buf, "{s}/" ++ funx_name, .{std.fs.path.dirname(exe).?}) catch unreachable;
        std.posix.symlink(exe, target) catch {
            outer: {
                if (fun.env_var.FUN_INSTALL.get()) |install_dir| {
                    target = std.fmt.bufPrint(&target_buf, "{s}/bin/" ++ funx_name, .{install_dir}) catch unreachable;
                    std.posix.symlink(exe, target) catch break :outer;
                    return;
                }
            }

            // if that fails, try $HOME/.fun/bin
            outer: {
                if (fun.env_var.HOME.get()) |home_dir| {
                    target = std.fmt.bufPrint(&target_buf, "{s}/.fun/bin/" ++ funx_name, .{home_dir}) catch unreachable;
                    std.posix.symlink(exe, target) catch break :outer;
                    return;
                }
            }

            // if that fails, try $HOME/.local/bin
            outer: {
                if (fun.env_var.HOME.get()) |home_dir| {
                    target = std.fmt.bufPrint(&target_buf, "{s}/.local/bin/" ++ funx_name, .{home_dir}) catch unreachable;
                    std.posix.symlink(exe, target) catch break :outer;
                    return;
                }
            }

            // otherwise...give up?

        };
    }

    fn installBunxSymlinkWindows(_: []const u8) !void {
        // Because symlinks are not always allowed on windows,
        // `funx.exe` on windows is a hardlink to `fun.exe`
        // for this to work, we need to delete and recreate the hardlink every time
        const image_path = fun.windows.exePathW();
        const image_dirname = image_path[0 .. (std.mem.lastIndexOfScalar(u16, image_path, '\\') orelse unreachable) + 1];

        var funx_path_buf: fun.WPathBuffer = undefined;

        std.os.windows.DeleteFile(try fun.strings.concatBufT(u16, &funx_path_buf, .{
            &fun.windows.nt_object_prefix,
            image_dirname,
            comptime fun.strings.literal(u16, funx_name ++ ".cmd"),
        }), .{ .dir = null }) catch {};

        const funx_path_with_z = try fun.strings.concatBufT(u16, &funx_path_buf, .{
            &fun.windows.nt_object_prefix,
            image_dirname,
            comptime fun.strings.literal(u16, funx_name ++ ".exe\x00"),
        });
        const funx_path = funx_path_with_z[0 .. funx_path_with_z.len - 1 :0];
        std.os.windows.DeleteFile(funx_path, .{ .dir = null }) catch {};

        if (fun.windows.CreateHardLinkW(funx_path, image_path, null) == 0) {
            // if hard link fails, use a cmd script
            const script = "@%~dp0fun.exe x %*\n";

            const funx_cmd_with_z = try fun.strings.concatBufT(u16, &funx_path_buf, .{
                &fun.windows.nt_object_prefix,
                image_dirname,
                comptime fun.strings.literal(u16, funx_name ++ ".exe\x00"),
            });
            const funx_cmd = funx_cmd_with_z[0 .. funx_cmd_with_z.len - 1 :0];
            // TODO: fix this zig bug, it is one line change to a few functions.
            // const file = try std.fs.createFileAbsoluteW(funx_cmd, .{});
            const file = try std.fs.cwd().createFileW(funx_cmd, .{});
            defer file.close();
            try file.writeAll(script);
        }
    }

    fn installBunxSymlink(cwd: []const u8) !void {
        if (Environment.isWindows) {
            try installBunxSymlinkWindows(cwd);
        } else {
            try installBunxSymlinkPosix(cwd);
        }
    }

    fn installUninstallerWindows() !void {
        // This uninstaller file is only written if the current exe is within a path
        // like `fun\bin\<whatever>.exe` so that it probably only runs when the
        // powershell `install.ps1` was used to install.

        const image_path = fun.windows.exePathW();
        const image_dirname = image_path[0..(std.mem.lastIndexOfScalar(u16, image_path, '\\') orelse unreachable)];

        if (!std.mem.endsWith(u16, image_dirname, comptime fun.strings.literal(u16, "fun\\bin")))
            return;

        const content = @embedFile("uninstall.ps1");

        var funx_path_buf: fun.WPathBuffer = undefined;
        const uninstaller_path = try fun.strings.concatBufT(u16, &funx_path_buf, .{
            &fun.windows.nt_object_prefix,
            image_dirname[0 .. image_dirname.len - 3],
            comptime fun.strings.literal(u16, "uninstall.ps1"),
        });

        const file = try std.fs.cwd().createFileW(uninstaller_path, .{});
        defer file.close();

        try file.writeAll(content);
    }

    pub fn exec(allocator: std.mem.Allocator) !void {
        // Fail silently on auto-update.
        const fail_exit_code: u8 = if (!fun.env_var.IS_FUN_AUTO_UPDATE.get()) 1 else 0;

        var cwd_buf: fun.PathBuffer = undefined;

        var stdout = std.fs.File.stdout();

        var shell = ShellCompletions.Shell.unknown;
        if (fun.env_var.SHELL.platformGet()) |shell_name| {
            shell = ShellCompletions.Shell.fromEnv(@TypeOf(shell_name), shell_name);
        }

        const cwd = fun.getcwd(&cwd_buf) catch {
            // don't fail on this if we don't actually need to
            if (fail_exit_code == 1) {
                if (!stdout.isTty()) {
                    stdout.writeAll(shell.completions()) catch |err| switch (err) {
                        error.BrokenPipe => Global.exit(0),
                        else => return err,
                    };
                    Global.exit(0);
                }
            }

            Output.prettyErrorln("<r><red>error<r>: Could not get current working directory", .{});
            Global.exit(fail_exit_code);
        };

        installBunxSymlink(cwd) catch {};

        if (Environment.isWindows) {
            installUninstallerWindows() catch {};
        }

        // TODO: https://github.com/underdoc-org/fun/issues/8939
        if (Environment.isWindows) {
            Output.errGeneric("PowerShell completions are not yet written for Fun yet.", .{});
            Output.printErrorln("See https://github.com/underdoc-org/fun/issues/8939", .{});
            return;
        }

        switch (shell) {
            .unknown => {
                Output.errGeneric("Unknown or unsupported shell. Please set $SHELL to one of zsh, fish, or bash.", .{});
                Output.note("To manually output completions, run 'fun getcompletes'", .{});
                Global.exit(fail_exit_code);
            },
            else => {},
        }

        if (!fun.env_var.IS_FUN_AUTO_UPDATE.get()) {
            if (!stdout.isTty()) {
                stdout.writeAll(shell.completions()) catch |err| switch (err) {
                    error.BrokenPipe => Global.exit(0),
                    else => return err,
                };
                Global.exit(0);
            }
        }

        var completions_dir: string = "";
        var output_dir: std.fs.Dir = found: {
            for (fun.argv, 0..) |arg, i| {
                if (strings.eqlComptime(arg, "completions")) {
                    if (fun.argv.len > i + 1) {
                        const input = fun.argv[i + 1];

                        if (!std.fs.path.isAbsolute(input)) {
                            completions_dir = resolve_path.joinAbs(
                                cwd,
                                .auto,
                                input,
                            );
                        } else {
                            completions_dir = input;
                        }

                        if (!std.fs.path.isAbsolute(completions_dir)) {
                            Output.prettyErrorln("<r><red>error:<r> Please pass an absolute path. {s} is invalid", .{completions_dir});
                            Global.exit(fail_exit_code);
                        }

                        break :found std.fs.openDirAbsolute(completions_dir, .{}) catch |err| {
                            Output.prettyErrorln("<r><red>error:<r> accessing {s} errored {s}", .{ completions_dir, @errorName(err) });
                            Global.exit(fail_exit_code);
                        };
                    }

                    break;
                }
            }

            switch (shell) {
                .fish => {
                    if (fun.env_var.XDG_CONFIG_HOME.get()) |config_dir| {
                        outer: {
                            var paths = [_]string{ config_dir, "./fish/completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);
                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.XDG_DATA_HOME.get()) |data_dir| {
                        outer: {
                            var paths = [_]string{ data_dir, "./fish/completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);

                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.HOME.get()) |home_dir| {
                        outer: {
                            var paths = [_]string{ home_dir, "./.config/fish/completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);
                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    outer: {
                        if (Environment.isMac) {
                            if (!Environment.isAarch64) {
                                // homebrew fish
                                completions_dir = "/usr/local/share/fish/completions";
                                break :found std.fs.openDirAbsolute("/usr/local/share/fish/completions", .{}) catch
                                    break :outer;
                            } else {
                                // homebrew fish
                                completions_dir = "/opt/homebrew/share/fish/completions";
                                break :found std.fs.openDirAbsolute("/opt/homebrew/share/fish/completions", .{}) catch
                                    break :outer;
                            }
                        }
                    }

                    outer: {
                        completions_dir = "/etc/fish/completions";
                        break :found std.fs.openDirAbsolute("/etc/fish/completions", .{}) catch break :outer;
                    }
                },
                .zsh => {
                    if (fun.env_var.fpath.get()) |fpath| {
                        var splitter = std.mem.splitScalar(u8, fpath, ' ');

                        while (splitter.next()) |dir| {
                            completions_dir = dir;
                            break :found std.fs.openDirAbsolute(dir, .{}) catch continue;
                        }
                    }

                    if (fun.env_var.XDG_DATA_HOME.get()) |data_dir| {
                        outer: {
                            var paths = [_]string{ data_dir, "./zsh-completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);

                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.FUN_INSTALL.get()) |home_dir| {
                        outer: {
                            completions_dir = home_dir;
                            break :found std.fs.openDirAbsolute(home_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.HOME.get()) |home_dir| {
                        {
                            outer: {
                                var paths = [_]string{ home_dir, "./.oh-my-zsh/completions" };
                                completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);
                                break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                    break :outer;
                            }
                        }

                        {
                            outer: {
                                var paths = [_]string{ home_dir, "./.fun" };
                                completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);
                                break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                    break :outer;
                            }
                        }
                    }

                    const dirs_to_try = [_]string{
                        "/usr/local/share/zsh/site-functions",
                        "/usr/local/share/zsh/completions",
                        "/opt/homebrew/share/zsh/completions",
                        "/opt/homebrew/share/zsh/site-functions",
                    };

                    for (dirs_to_try) |dir| {
                        completions_dir = dir;
                        break :found std.fs.openDirAbsolute(dir, .{}) catch continue;
                    }
                },
                .bash => {
                    if (fun.env_var.XDG_DATA_HOME.get()) |data_dir| {
                        outer: {
                            var paths = [_]string{ data_dir, "./bash-completion/completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);
                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.XDG_CONFIG_HOME.get()) |config_dir| {
                        outer: {
                            var paths = [_]string{ config_dir, "./bash-completion/completions" };
                            completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);

                            break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                break :outer;
                        }
                    }

                    if (fun.env_var.HOME.get()) |home_dir| {
                        {
                            outer: {
                                var paths = [_]string{ home_dir, "./.oh-my-bash/custom/completions" };
                                completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);

                                break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                    break :outer;
                            }
                        }
                        {
                            outer: {
                                var paths = [_]string{ home_dir, "./.bash_completion.d" };
                                completions_dir = resolve_path.joinAbsString(cwd, &paths, .auto);

                                break :found std.fs.openDirAbsolute(completions_dir, .{}) catch
                                    break :outer;
                            }
                        }
                    }

                    const dirs_to_try = [_]string{
                        "/opt/homebrew/share/bash-completion/completions/",
                        "/opt/local/share/bash-completion/completions/",
                    };

                    for (dirs_to_try) |dir| {
                        completions_dir = dir;
                        break :found std.fs.openDirAbsolute(dir, .{}) catch continue;
                    }
                },
                else => unreachable,
            }

            Output.prettyErrorln(
                "<r><red>error:<r> Could not find a directory to install completions in.\n",
                .{},
            );

            if (shell == .zsh) {
                Output.prettyErrorln(
                    "\nzsh tip: One of the directories in $fpath might work. If you use oh-my-zsh, try mkdir $HOME/.oh-my-zsh/completions; and fun completions again\n.",
                    .{},
                );
            }

            Output.printErrorln(
                "Please either pipe it:\n   fun completions > /to/a/file\n\n Or pass a directory:\n\n   fun completions /my/completions/dir\n",
                .{},
            );
            Global.exit(fail_exit_code);
        };

        const filename = switch (shell) {
            .fish => "fun.fish",
            .zsh => "_fun",
            .bash => "fun.completion.bash",
            else => unreachable,
        };

        fun.assert(completions_dir.len > 0);

        var output_file = output_dir.createFileZ(filename, .{
            .truncate = true,
        }) catch |err| {
            Output.prettyErrorln("<r><red>error:<r> Could not open {s} for writing: {s}", .{
                filename,
                @errorName(err),
            });
            Global.exit(fail_exit_code);
        };

        output_file.writeAll(shell.completions()) catch |err| {
            Output.prettyErrorln("<r><red>error:<r> Could not write to {s}: {s}", .{
                filename,
                @errorName(err),
            });
            Global.exit(fail_exit_code);
        };

        defer output_file.close();
        output_dir.close();

        // Check if they need to load the zsh completions file into their .zshrc
        if (shell == .zsh) {
            var completions_absolute_path_buf: fun.PathBuffer = undefined;
            const completions_path = fun.getFdPath(.fromStdFile(output_file), &completions_absolute_path_buf) catch unreachable;
            var zshrc_filepath: fun.PathBuffer = undefined;
            const needs_to_tell_them_to_add_completions_file = brk: {
                var dot_zshrc: std.fs.File = zshrc: {
                    first: {

                        // https://zsh.sourceforge.io/Intro/intro_3.html
                        // There are five startup files that zsh will read commands from:
                        // $ZDOTDIR/.zshenv
                        // $ZDOTDIR/.zprofile
                        // $ZDOTDIR/.zshrc
                        // $ZDOTDIR/.zlogin
                        // $ZDOTDIR/.zlogout

                        if (fun.env_var.ZDOTDIR.get()) |zdot_dir| {
                            fun.copy(u8, &zshrc_filepath, zdot_dir);
                            fun.copy(u8, zshrc_filepath[zdot_dir.len..], "/.zshrc");
                            zshrc_filepath[zdot_dir.len + "/.zshrc".len] = 0;
                            const filepath = zshrc_filepath[0 .. zdot_dir.len + "/.zshrc".len :0];
                            break :zshrc std.fs.openFileAbsoluteZ(filepath, .{ .mode = .read_write }) catch break :first;
                        }
                    }

                    second: {
                        if (fun.env_var.HOME.get()) |zdot_dir| {
                            fun.copy(u8, &zshrc_filepath, zdot_dir);
                            fun.copy(u8, zshrc_filepath[zdot_dir.len..], "/.zshrc");
                            zshrc_filepath[zdot_dir.len + "/.zshrc".len] = 0;
                            const filepath = zshrc_filepath[0 .. zdot_dir.len + "/.zshrc".len :0];
                            break :zshrc std.fs.openFileAbsoluteZ(filepath, .{ .mode = .read_write }) catch break :second;
                        }
                    }

                    third: {
                        if (fun.env_var.HOME.get()) |zdot_dir| {
                            fun.copy(u8, &zshrc_filepath, zdot_dir);
                            fun.copy(u8, zshrc_filepath[zdot_dir.len..], "/.zshenv");
                            zshrc_filepath[zdot_dir.len + "/.zshenv".len] = 0;
                            const filepath = zshrc_filepath[0 .. zdot_dir.len + "/.zshenv".len :0];
                            break :zshrc std.fs.openFileAbsoluteZ(filepath, .{ .mode = .read_write }) catch break :third;
                        }
                    }

                    break :brk true;
                };

                // Sometimes, stat() lies to us and says the file is 0 bytes
                // Let's not trust it and read the whole file
                const input_size = @max(dot_zshrc.getEndPos() catch break :brk true, 64 * 1024);

                defer dot_zshrc.close();
                var buf = allocator.alloc(
                    u8,
                    input_size +
                        completions_path.len * 4 + 96,
                ) catch break :brk true;

                const read = dot_zshrc.preadAll(
                    buf,
                    0,
                ) catch break :brk true;

                if (comptime Environment.isWindows) {
                    try dot_zshrc.seekTo(0);
                }

                const contents = buf[0..read];

                // Do they possibly have it in the file already?
                if (strings.contains(contents, completions_path) or strings.contains(contents, "# fun completions\n")) {
                    break :brk false;
                }

                // Okay, we need to add it

                // We need to add it to the end of the file
                const remaining = buf[read..];
                const extra = std.fmt.bufPrint(remaining, "\n# fun completions\n[ -s \"{s}\" ] && source \"{s}\"\n", .{
                    completions_path,
                    completions_path,
                }) catch unreachable;

                dot_zshrc.pwriteAll(extra, read) catch break :brk true;

                Output.prettyErrorln("<r><d>Enabled loading fun's completions in .zshrc<r>", .{});
                break :brk false;
            };

            if (needs_to_tell_them_to_add_completions_file) {
                Output.prettyErrorln("<r>To enable completions, add this to your .zshrc:\n      <b>[ -s \"{s}\" ] && source \"{s}\"", .{
                    completions_path,
                    completions_path,
                });
            }
        }

        Output.prettyErrorln("<r><d>Installed completions to {s}/{s}<r>\n", .{
            completions_dir,
            filename,
        });
        Output.flush();
    }
};

const string = []const u8;

const ShellCompletions = @import("./shell_completions.zig");
const fs = @import("../resolver/fs.zig");
const resolve_path = @import("../paths/resolve_path.zig");
const std = @import("std");
const which = @import("../which/which.zig").which;

const fun = @import("fun");
const Environment = fun.Environment;
const Global = fun.Global;
const Output = fun.Output;
const strings = fun.strings;
