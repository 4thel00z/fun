pub var initialized_store = false;
pub fn initializeStore() void {
    if (initialized_store) return;
    initialized_store = true;
    js_ast.Expr.Data.Store.create();
    js_ast.Stmt.Data.Store.create();
}

pub const Version = struct {
    zip_url: string,
    tag: string,
    buf: MutableString,
    size: u32 = 0,

    pub fn name(this: Version) ?string {
        if (this.tag.len <= "fun-v".len or !strings.hasPrefixComptime(this.tag, "fun-v")) {
            if (strings.eqlComptime(this.tag, "canary")) {
                const Cli = @import("./cli.zig");

                return std.fmt.allocPrint(
                    fun.default_allocator,
                    "fun-canary-timestamp-{f}",
                    .{
                        fun.fmt.hexIntLower(
                            fun.hash(
                                std.mem.asBytes(&Cli.start_time),
                            ),
                        ),
                    },
                ) catch |err| fun.handleOom(err);
            }
            return this.tag;
        }

        return this.tag["fun-v".len..];
    }

    pub const platform_label = switch (Environment.os) {
        .mac => "darwin",
        .linux => "linux",
        .windows => "windows",
        .freebsd => "freebsd",
        .wasm => @compileError("Unsupported OS for Fun Upgrade"),
    };

    pub const arch_label = if (Environment.isAarch64) "aarch64" else "x64";
    pub const triplet = platform_label ++ "-" ++ arch_label;
    const suffix_abi = if (Environment.isMusl) "-musl" else if (Environment.isAndroid) "-android" else "";
    const suffix_cpu = if (Environment.baseline) "-baseline" else "";
    const suffix = suffix_abi ++ suffix_cpu;
    pub const folder_name = "fun-" ++ triplet ++ suffix;
    pub const baseline_folder_name = "fun-" ++ triplet ++ "-baseline";
    pub const zip_filename = folder_name ++ ".zip";
    pub const baseline_zip_filename = baseline_folder_name ++ ".zip";

    pub const profile_folder_name = "fun-" ++ triplet ++ suffix ++ "-profile";
    pub const profile_zip_filename = profile_folder_name ++ ".zip";

    const current_version: string = "fun-v" ++ Global.package_json_version;

    pub export const Fun__githubURL: [*:0]const u8 = std.fmt.comptimePrint("https://github.com/underdoc-org/fun/releases/download/fun-v{s}/{s}", .{
        Global.package_json_version,
        zip_filename,
    });

    pub const Fun__githubBaselineURL: [:0]const u8 = std.fmt.comptimePrint("https://github.com/underdoc-org/fun/releases/download/fun-v{s}/{s}", .{
        Global.package_json_version,
        baseline_zip_filename,
    });

    pub fn isCurrent(this: Version) bool {
        return strings.eqlComptime(this.tag, current_version);
    }

    pub fn @"export"() void {
        _ = &Fun__githubURL;
        _ = &Fun__githubBaselineURL;
    }
};

pub const UpgradeCommand = struct {
    pub const Fun__githubBaselineURL = Version.Fun__githubBaselineURL;

    const default_github_headers: string = "Acceptapplication/vnd.github.v3+json";
    var github_repository_url_buf: fun.PathBuffer = undefined;
    var current_executable_buf: fun.PathBuffer = undefined;
    var unzip_path_buf: fun.PathBuffer = undefined;
    var tmpdir_path_buf: fun.PathBuffer = undefined;

    pub fn getLatestVersion(
        allocator: std.mem.Allocator,
        env_loader: *DotEnv.Loader,
        refresher: ?*Progress,
        progress: ?*Progress.Node,
        use_profile: bool,
        comptime silent: bool,
    ) !?Version {
        var headers_buf: string = default_github_headers;
        // gonna have to free memory myself like a goddamn caveman due to a thread safety issue with ArenaAllocator
        defer {
            if (comptime silent) {
                if (headers_buf.ptr != default_github_headers.ptr) allocator.free(headers_buf);
            }
        }

        var header_entries: Headers.Entry.List = .empty;
        const accept = Headers.Entry{
            .name = .{ .offset = 0, .length = @intCast("Accept".len) },
            .value = .{ .offset = @intCast("Accept".len), .length = @intCast("application/vnd.github.v3+json".len) },
        };
        try header_entries.append(allocator, accept);
        defer if (comptime silent) header_entries.deinit(allocator);

        // Incase they're using a GitHub proxy in e.g. China
        var github_api_domain: string = "api.github.com";
        if (env_loader.map.get("GITHUB_API_DOMAIN")) |api_domain| {
            if (api_domain.len > 0) {
                github_api_domain = api_domain;
            }
        }

        const api_url = URL.parse(
            try std.fmt.bufPrint(
                &github_repository_url_buf,
                "https://{s}/repos/Jarred-Sumner/fun-releases-for-updater/releases/latest",
                .{
                    github_api_domain,
                },
            ),
        );

        if (env_loader.map.get("GITHUB_TOKEN") orelse env_loader.map.get("GITHUB_ACCESS_TOKEN")) |access_token| {
            if (access_token.len > 0) {
                headers_buf = try std.fmt.allocPrint(allocator, default_github_headers ++ "AuthorizationBearer {s}", .{access_token});
                try header_entries.append(
                    allocator,
                    .{
                        .name = .{
                            .offset = accept.value.offset + accept.value.length,
                            .length = @intCast("Authorization".len),
                        },
                        .value = .{
                            .offset = @intCast(accept.value.offset + accept.value.length + "Authorization".len),
                            .length = @intCast("Bearer ".len + access_token.len),
                        },
                    },
                );
            }
        }

        const http_proxy: ?URL = env_loader.getHttpProxyFor(api_url);

        var metadata_body = try MutableString.init(allocator, 2048);

        // ensure very stable memory address
        var async_http: *HTTP.AsyncHTTP = try allocator.create(HTTP.AsyncHTTP);
        async_http.* = HTTP.AsyncHTTP.initSync(
            allocator,
            .GET,
            api_url,
            header_entries,
            headers_buf,
            &metadata_body,
            "",
            http_proxy,
            null,
            HTTP.FetchRedirect.follow,
        );
        async_http.client.flags.reject_unauthorized = env_loader.getTLSRejectUnauthorized();

        if (!silent) async_http.client.progress_node = progress.?;
        const response = try async_http.sendSync();

        switch (response.status_code) {
            404 => return error.HTTP404,
            403 => return error.HTTPForbidden,
            429 => return error.HTTPTooManyRequests,
            499...599 => return error.GitHubIsDown,
            200 => {},
            else => return error.HTTPError,
        }

        var log = logger.Log.init(allocator);
        defer if (comptime silent) log.deinit();
        const source = &logger.Source.initPathString("releases.json", metadata_body.list.items);
        initializeStore();
        var expr = JSON.parseUTF8(source, &log, allocator) catch |err| {
            if (!silent) {
                progress.?.end();
                refresher.?.refresh();

                if (log.errors > 0) {
                    try log.print(Output.errorWriter());

                    Global.exit(1);
                } else {
                    Output.prettyErrorln("Error parsing releases from GitHub: <r><red>{s}<r>", .{@errorName(err)});
                    Global.exit(1);
                }
            }

            return null;
        };

        if (log.errors > 0) {
            if (!silent) {
                progress.?.end();
                refresher.?.refresh();

                try log.print(Output.errorWriter());
                Global.exit(1);
            }

            return null;
        }

        var version = Version{ .zip_url = "", .tag = "", .buf = metadata_body, .size = 0 };

        if (expr.data != .e_object) {
            if (!silent) {
                progress.?.end();
                refresher.?.refresh();

                const json_type: js_ast.Expr.Tag = @as(js_ast.Expr.Tag, expr.data);
                Output.prettyErrorln("JSON error - expected an object but received {s}", .{@tagName(json_type)});
                Global.exit(1);
            }

            return null;
        }

        if (expr.asProperty("tag_name")) |tag_name_| {
            if (tag_name_.expr.asString(allocator)) |tag_name| {
                version.tag = tag_name;
            }
        }

        if (version.tag.len == 0) {
            if (comptime !silent) {
                progress.?.end();
                refresher.?.refresh();

                Output.prettyErrorln("JSON Error parsing releases from GitHub: <r><red>tag_name<r> is missing?\n{s}", .{metadata_body.list.items});
                Global.exit(1);
            }

            return null;
        }

        get_asset: {
            const assets_ = expr.asProperty("assets") orelse break :get_asset;
            var assets = assets_.expr.asArray() orelse break :get_asset;

            while (assets.next()) |asset| {
                if (asset.asProperty("content_type")) |content_type| {
                    const content_type_ = (content_type.expr.asString(allocator)) orelse continue;
                    if (comptime Environment.isDebug) {
                        Output.prettyln("Content-type: {s}", .{content_type_});
                        Output.flush();
                    }

                    if (!strings.eqlComptime(content_type_, "application/zip")) continue;
                }

                if (asset.asProperty("name")) |name_| {
                    if (name_.expr.asString(allocator)) |name| {
                        if (comptime Environment.isDebug) {
                            const filename = if (!use_profile) Version.zip_filename else Version.profile_zip_filename;
                            Output.prettyln("Comparing {s} vs {s}", .{ name, filename });
                            Output.flush();
                        }

                        if (!use_profile and !strings.eqlComptime(name, Version.zip_filename)) continue;
                        if (use_profile and !strings.eqlComptime(name, Version.profile_zip_filename)) continue;

                        version.zip_url = (asset.asProperty("browser_download_url") orelse break :get_asset).expr.asString(allocator) orelse break :get_asset;
                        if (comptime Environment.isDebug) {
                            Output.prettyln("Found Zip {s}", .{version.zip_url});
                            Output.flush();
                        }

                        if (asset.asProperty("size")) |size_| {
                            if (size_.expr.data == .e_number) {
                                version.size = @as(u32, @intCast(@max(@as(i32, @intFromFloat(std.math.ceil(size_.expr.data.e_number.value))), 0)));
                            }
                        }
                        return version;
                    }
                }
            }
        }

        if (comptime !silent) {
            progress.?.end();
            refresher.?.refresh();
            if (version.name()) |name| {
                Output.prettyErrorln("Fun v{s} is out, but not for this platform ({s}) yet.", .{
                    name, Version.triplet,
                });
            }

            Global.exit(0);
        }

        return null;
    }

    const exe_suffix = if (Environment.isWindows) ".exe" else "";

    const exe_subpath = Version.folder_name ++ std.fs.path.sep_str ++ "fun" ++ exe_suffix;
    const profile_exe_subpath = Version.profile_folder_name ++ std.fs.path.sep_str ++ "fun-profile" ++ exe_suffix;

    const manual_upgrade_command = switch (Environment.os) {
        .linux, .mac => "curl -fsSL https://fun.dev/install | bash",
        .windows => "powershell -c 'irm fun.dev/install.ps1|iex'",
        else => "(TODO: Install script for " ++ Environment.os.displayString() ++ ")",
    };

    pub fn exec(ctx: Command.Context) !void {
        @branchHint(.cold);

        const args = fun.argv;
        if (args.len > 2) {
            for (args[2..]) |arg| {
                if (!strings.contains(arg, "--")) {
                    Output.prettyError(
                        \\<r><red>error<r><d>:<r> This command updates Fun itself, and does not take package names.
                        \\<blue>note<r><d>:<r> Use `fun update
                    , .{});
                    for (args[2..]) |arg_err| {
                        Output.prettyError(" {s}", .{arg_err});
                    }
                    Output.prettyErrorln("` instead.", .{});
                    Global.exit(1);
                }
            }
        }

        _exec(ctx) catch |err| {
            Output.prettyErrorln(
                \\<r>Fun upgrade failed with error: <red><b>{s}<r>
                \\
                \\<cyan>Please upgrade manually<r>:
                \\  <b>{s}<r>
                \\
                \\
            , .{ @errorName(err), manual_upgrade_command });
            Global.exit(1);
        };
    }

    fn _exec(ctx: Command.Context) !void {
        HTTP.HTTPThread.init(&.{});

        var filesystem = try fs.FileSystem.init(null);
        var env_loader: DotEnv.Loader = brk: {
            const map = try ctx.allocator.create(DotEnv.Map);
            map.* = DotEnv.Map.init(ctx.allocator);

            break :brk DotEnv.Loader.init(map, ctx.allocator);
        };
        try env_loader.loadProcess();

        const use_canary = brk: {
            const default_use_canary = Environment.is_canary;

            if (default_use_canary and strings.containsAny(fun.argv, "--stable"))
                break :brk false;

            break :brk strings.eqlComptime(env_loader.map.get("FUN_CANARY") orelse "0", "1") or
                strings.containsAny(fun.argv, "--canary") or default_use_canary;
        };

        const use_profile = strings.containsAny(fun.argv, "--profile");

        var version: Version = if (!use_canary) v: {
            var refresher = Progress{};
            var progress = refresher.start("Fetching version tags", 0);

            const version = (try getLatestVersion(ctx.allocator, &env_loader, &refresher, progress, use_profile, false)) orelse return;

            progress.end();
            refresher.refresh();

            if (!Environment.is_canary) {
                if (version.name() != null and version.isCurrent()) {
                    Output.prettyErrorln(
                        "<r><green>Congrats!<r> You're already on the latest version of Fun <d>(which is v{s})<r>",
                        .{
                            version.name().?,
                        },
                    );
                    Global.exit(0);
                }
            }

            if (version.name() == null) {
                Output.prettyErrorln(
                    "<r><red>error:<r> Fun versions are currently unavailable (the latest version name didn't match the expeccted format)",
                    .{},
                );
                Global.exit(1);
            }

            if (!Environment.is_canary) {
                Output.prettyErrorln("<r><b>Fun <cyan>v{s}<r> is out<r>! You're on <blue>v{s}<r>\n", .{ version.name().?, Global.package_json_version });
            } else {
                Output.prettyErrorln("<r><b>Downgrading from Fun <blue>{s}-canary<r> to Fun <cyan>v{s}<r><r>\n", .{ Global.package_json_version, version.name().? });
            }
            Output.flush();

            break :v version;
        } else Version{
            .tag = "canary",
            .zip_url = "https://github.com/underdoc-org/fun/releases/download/canary/" ++ Version.zip_filename,
            .size = 0,
            .buf = MutableString.initEmpty(fun.default_allocator),
        };

        const zip_url = URL.parse(version.zip_url);
        const http_proxy: ?URL = env_loader.getHttpProxyFor(zip_url);

        {
            var refresher = Progress{};
            var progress = refresher.start("Downloading", version.size);
            progress.unit = .bytes;
            refresher.refresh();
            var async_http = try ctx.allocator.create(HTTP.AsyncHTTP);
            var zip_file_buffer = try ctx.allocator.create(MutableString);
            zip_file_buffer.* = try MutableString.init(ctx.allocator, @max(version.size, 1024));

            async_http.* = HTTP.AsyncHTTP.initSync(
                ctx.allocator,
                .GET,
                zip_url,
                .{},
                "",
                zip_file_buffer,
                "",
                http_proxy,
                null,
                HTTP.FetchRedirect.follow,
            );
            async_http.client.progress_node = progress;
            async_http.client.flags.reject_unauthorized = env_loader.getTLSRejectUnauthorized();

            const response = try async_http.sendSync();

            switch (response.status_code) {
                404 => {
                    if (use_canary) {
                        Output.prettyErrorln(
                            \\<r><red>error:<r> Canary builds are not available for this platform yet
                            \\
                            \\   Release: <cyan>https://github.com/underdoc-org/fun/releases/tag/canary<r>
                            \\  Filename: <b>{s}<r>
                            \\
                        , .{
                            Version.zip_filename,
                        });
                        Global.exit(1);
                    }

                    return error.HTTP404;
                },
                403 => return error.HTTPForbidden,
                429 => return error.HTTPTooManyRequests,
                499...599 => return error.GitHubIsDown,
                200 => {},
                else => return error.HTTPError,
            }

            const bytes = zip_file_buffer.slice();

            progress.end();
            refresher.refresh();

            if (bytes.len == 0) {
                Output.prettyErrorln("<r><red>error:<r> Failed to download the latest version of Fun. Received empty content", .{});
                Global.exit(1);
            }

            const version_name = version.name().?;

            var save_dir_ = filesystem.tmpdir() catch |err| {
                Output.errGeneric("Failed to open temporary directory: {s}", .{@errorName(err)});
                Global.exit(1);
            };

            const save_dir_it = save_dir_.makeOpenPath(version_name, .{}) catch |err| {
                Output.errGeneric("Failed to open temporary directory: {s}", .{@errorName(err)});
                Global.exit(1);
            };
            const save_dir = save_dir_it;
            const tmpdir_path = fun.FD.fromStdDir(save_dir).getFdPath(&tmpdir_path_buf) catch |err| {
                Output.errGeneric("Failed to read temporary directory: {s}", .{@errorName(err)});
                Global.exit(1);
            };

            tmpdir_path_buf[tmpdir_path.len] = 0;
            const tmpdir_z = tmpdir_path_buf[0..tmpdir_path.len :0];
            _ = fun.sys.chdir("", tmpdir_z);

            const tmpname = "fun.zip";
            const exe =
                if (use_profile) profile_exe_subpath else exe_subpath;

            var zip_file = save_dir.createFileZ(tmpname, .{ .truncate = true }) catch |err| {
                Output.prettyErrorln("<r><red>error:<r> Failed to open temp file {s}", .{@errorName(err)});
                Global.exit(1);
            };

            {
                _ = zip_file.writeAll(bytes) catch |err| {
                    save_dir.deleteFileZ(tmpname) catch {};
                    Output.prettyErrorln("<r><red>error:<r> Failed to write to temp file {s}", .{@errorName(err)});
                    Global.exit(1);
                };
                zip_file.close();
            }

            {
                defer {
                    save_dir.deleteFileZ(tmpname) catch {};
                }

                if (comptime Environment.isPosix) {
                    const unzip_exe = which(&unzip_path_buf, env_loader.map.get("PATH") orelse "", filesystem.top_level_dir, "unzip") orelse {
                        save_dir.deleteFileZ(tmpname) catch {};
                        Output.prettyErrorln("<r><red>error:<r> Failed to locate \"unzip\" in PATH. fun upgrade needs \"unzip\" to work.", .{});
                        Global.exit(1);
                    };

                    // We could just embed libz2
                    // however, we want to be sure that xattrs are preserved
                    // xattrs are used for codesigning
                    // it'd be easy to mess that up
                    var unzip_argv = [_]string{
                        fun.asByteSlice(unzip_exe),
                        "-q",
                        "-o",
                        tmpname,
                    };

                    var unzip_process = std.process.Child.init(&unzip_argv, ctx.allocator);
                    unzip_process.cwd = tmpdir_path;
                    unzip_process.stdin_behavior = .Inherit;
                    unzip_process.stdout_behavior = .Inherit;
                    unzip_process.stderr_behavior = .Inherit;

                    const unzip_result = unzip_process.spawnAndWait() catch |err| {
                        save_dir.deleteFileZ(tmpname) catch {};
                        Output.prettyErrorln("<r><red>error:<r> Failed to spawn unzip due to {s}.", .{@errorName(err)});
                        Global.exit(1);
                    };

                    if (unzip_result.Exited != 0) {
                        Output.prettyErrorln("<r><red>Unzip failed<r> (exit code: {d})", .{unzip_result.Exited});
                        save_dir.deleteFileZ(tmpname) catch {};
                        Global.exit(1);
                    }
                } else if (comptime Environment.isWindows) {
                    // Run a powershell script to unzip the file
                    const unzip_script = try std.fmt.allocPrint(
                        ctx.allocator,
                        "$global:ProgressPreference='SilentlyContinue';Expand-Archive -Path \"{f}\" \"{f}\" -Force",
                        .{
                            fun.fmt.escapePowershell(tmpname),
                            fun.fmt.escapePowershell(tmpdir_path),
                        },
                    );

                    var buf: fun.PathBuffer = undefined;
                    const powershell_path =
                        fun.which(&buf, fun.env_var.PATH.get() orelse "", "", "powershell") orelse
                        hardcoded_system_powershell: {
                            const system_root = fun.env_var.SYSTEMROOT.get() orelse "C:\\Windows";
                            const hardcoded_system_powershell = fun.path.joinAbsStringBuf(system_root, &buf, &.{ system_root, "System32\\WindowsPowerShell\\v1.0\\powershell.exe" }, .windows);
                            if (fun.sys.exists(hardcoded_system_powershell)) {
                                break :hardcoded_system_powershell hardcoded_system_powershell;
                            }
                            Output.prettyErrorln("<r><red>error:<r> Failed to unzip {s} due to PowerShell not being installed.", .{tmpname});
                            Global.exit(1);
                        };

                    var unzip_argv = [_]string{
                        powershell_path,
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-Command",
                        unzip_script,
                    };

                    _ = (fun.spawnSync(&.{
                        .argv = &unzip_argv,

                        .envp = null,
                        .cwd = tmpdir_path,

                        .stderr = .inherit,
                        .stdout = .inherit,
                        .stdin = .inherit,

                        .windows = if (Environment.isWindows) .{
                            .loop = fun.jsc.EventLoopHandle.init(fun.jsc.MiniEventLoop.initGlobal(null, null)),
                        },
                    }) catch |err| {
                        Output.prettyErrorln("<r><red>error:<r> Failed to spawn Expand-Archive on {s} due to error {s}", .{ tmpname, @errorName(err) });
                        Global.exit(1);
                    }).unwrap() catch |err| {
                        Output.prettyErrorln("<r><red>error:<r> Failed to run Expand-Archive on {s} due to error {s}", .{ tmpname, @errorName(err) });
                        Global.exit(1);
                    };
                }
            }
            {
                var verify_argv = [_]string{
                    exe,
                    if (use_canary) "--revision" else "--version",
                };

                const result = std.process.Child.run(.{
                    .allocator = ctx.allocator,
                    .argv = &verify_argv,
                    .cwd = tmpdir_path,
                    .max_output_bytes = 512,
                }) catch |err| {
                    defer save_dir_.deleteTree(version_name) catch {};

                    if (err == error.FileNotFound) {
                        if (std.fs.cwd().access(exe, .{})) {
                            // On systems like NixOS, the FileNotFound is actually the system-wide linker,
                            // as they do not have one (most systems have it at a known path). This is how
                            // ChildProcess returns FileNotFound despite the actual
                            //
                            // In these cases, prebuilt binaries from GitHub will never work without
                            // extra patching, so we will print a message deferring them to their system
                            // package manager.
                            Output.prettyErrorln(
                                \\<r><red>error<r><d>:<r> 'fun upgrade' is unsupported on systems without ld
                                \\
                                \\You are likely on an immutable system such as NixOS, where dynamic
                                \\libraries are stored in a global cache.
                                \\
                                \\Please use your system's package manager to properly upgrade fun.
                                \\
                            , .{});
                            Global.exit(1);
                            return;
                        } else |_| {}
                    }

                    Output.prettyErrorln("<r><red>error<r><d>:<r> Failed to verify Fun (code: {s})<r>", .{@errorName(err)});
                    Global.exit(1);
                };

                if (result.term.Exited != 0) {
                    save_dir_.deleteTree(version_name) catch {};
                    Output.prettyErrorln("<r><red>error<r><d>:<r> failed to verify Fun<r> (exit code: {d})", .{result.term.Exited});
                    Global.exit(1);
                }

                // It should run successfully
                // but we don't care about the version number if we're doing a canary build
                if (use_canary) {
                    var version_string = result.stdout;
                    if (strings.indexOfChar(version_string, '+')) |i| {
                        version.tag = version_string[i + 1 .. version_string.len];
                    }
                } else {
                    var version_string = result.stdout;
                    if (strings.indexOfChar(version_string, ' ')) |i| {
                        version_string = version_string[0..i];
                    }

                    if (!strings.eql(std.mem.trim(u8, version_string, " \n\r\t"), version_name)) {
                        save_dir_.deleteTree(version_name) catch {};

                        Output.prettyErrorln(
                            "<r><red>error<r>: The downloaded version of Fun (<red>{s}<r>) doesn't match the expected version (<b>{s}<r>)<r>. Cancelled upgrade",
                            .{
                                version_string[0..@min(version_string.len, 512)],
                                version_name,
                            },
                        );
                        Global.exit(1);
                    }
                }
            }

            const destination_executable = fun.selfExePath() catch return error.UpgradeFailedMissingExecutable;
            @memcpy((&current_executable_buf).ptr, destination_executable);
            current_executable_buf[destination_executable.len] = 0;

            const target_filename_ = std.fs.path.basename(destination_executable);
            const target_filename = current_executable_buf[destination_executable.len - target_filename_.len ..][0..target_filename_.len :0];
            const target_dir_ = std.fs.path.dirname(destination_executable) orelse return error.UpgradeFailedBecauseOfMissingExecutableDir;
            // safe because the slash will no longer be in use
            current_executable_buf[target_dir_.len] = 0;
            const target_dirname = current_executable_buf[0..target_dir_.len :0];
            const target_dir_it = std.fs.openDirAbsoluteZ(target_dirname, .{}) catch |err| {
                save_dir_.deleteTree(version_name) catch {};
                Output.prettyErrorln("<r><red>error:<r> Failed to open Fun's install directory {s}", .{@errorName(err)});
                Global.exit(1);
            };
            var target_dir = target_dir_it;

            if (use_canary) {

                // Check if the versions are the same
                const target_stat = target_dir.statFile(target_filename) catch |err| {
                    save_dir_.deleteTree(version_name) catch {};
                    Output.prettyErrorln("<r><red>error:<r> {s} while trying to stat target {s} ", .{ @errorName(err), target_filename });
                    Global.exit(1);
                };

                const dest_stat = save_dir.statFile(exe) catch |err| {
                    save_dir_.deleteTree(version_name) catch {};
                    Output.prettyErrorln("<r><red>error:<r> {s} while trying to stat source {s}", .{ @errorName(err), exe });
                    Global.exit(1);
                };

                if (target_stat.size == dest_stat.size and target_stat.size > 0) {
                    const input_buf = try ctx.allocator.alloc(u8, target_stat.size);

                    const target_hash = fun.hash(target_dir.readFile(target_filename, input_buf) catch |err| {
                        save_dir_.deleteTree(version_name) catch {};
                        Output.prettyErrorln("<r><red>error:<r> Failed to read target fun {s}", .{@errorName(err)});
                        Global.exit(1);
                    });

                    const source_hash = fun.hash(save_dir.readFile(exe, input_buf) catch |err| {
                        save_dir_.deleteTree(version_name) catch {};
                        Output.prettyErrorln("<r><red>error:<r> Failed to read source fun {s}", .{@errorName(err)});
                        Global.exit(1);
                    });

                    if (target_hash == source_hash) {
                        save_dir_.deleteTree(version_name) catch {};
                        Output.prettyErrorln(
                            \\<r><green>Congrats!<r> You're already on the latest <b>canary<r><green> build of Fun
                            \\
                            \\To downgrade to the latest stable release, run <b><cyan>fun upgrade --stable<r>
                            \\
                        ,
                            .{},
                        );
                        Global.exit(0);
                    }
                }
            }

            var outdated_filename: if (Environment.isWindows) ?stringZ else ?void = null;

            if (env_loader.map.get("FUN_DRY_RUN") == null) {
                if (comptime Environment.isWindows) {
                    // On Windows, we cannot replace the running executable directly.
                    // we rename the old executable to a temporary name, and then move the new executable to the old name.
                    // This is because Windows locks the executable while it's running.
                    current_executable_buf[target_dir_.len] = '\\';
                    outdated_filename = try std.fmt.allocPrintSentinel(ctx.allocator, "{s}\\{s}.outdated", .{
                        target_dirname,
                        target_filename,
                    }, 0);
                    std.posix.rename(destination_executable, outdated_filename.?) catch |err| {
                        save_dir_.deleteTree(version_name) catch {};
                        Output.prettyErrorln("<r><red>error:<r> Failed to rename current executable {s}", .{@errorName(err)});
                        Global.exit(1);
                    };
                    current_executable_buf[target_dir_.len] = 0;
                }

                fun.sys.moveFileZ(.fromStdDir(save_dir), exe, .fromStdDir(target_dir), target_filename) catch |err| {
                    defer save_dir_.deleteTree(version_name) catch {};

                    if (comptime Environment.isWindows) {
                        // Attempt to restore the old executable. If this fails, the user will be left without a working copy of fun.
                        std.posix.rename(outdated_filename.?, destination_executable) catch {
                            Output.errGeneric(
                                \\Failed to move new version of Fun to {s} due to {s}
                            ,
                                .{
                                    destination_executable,
                                    @errorName(err),
                                },
                            );
                            Output.errGeneric(
                                \\Failed to restore the working copy of Fun. The installation is now corrupt.
                                \\
                                \\Please reinstall Fun manually with the following command:
                                \\   {s}
                                \\
                            ,
                                .{manual_upgrade_command},
                            );
                            Global.exit(1);
                        };
                    }

                    Output.errGeneric(
                        \\Failed to move new version of Fun to {s} to {s}
                        \\
                        \\Please reinstall Fun manually with the following command:
                        \\   {s}
                        \\
                    ,
                        .{
                            destination_executable,
                            @errorName(err),
                            manual_upgrade_command,
                        },
                    );
                    Global.exit(1);
                };
            }

            // Ensure completions are up to date.
            {
                var completions_argv = [_]string{
                    target_filename,
                    "completions",
                };

                fun.handleOom(env_loader.map.put("IS_FUN_AUTO_UPDATE", "true"));
                var std_map = try env_loader.map.stdEnvMap(ctx.allocator);
                defer std_map.deinit();
                _ = std.process.Child.run(.{
                    .allocator = ctx.allocator,
                    .argv = &completions_argv,
                    .cwd = target_dirname,
                    .max_output_bytes = 4096,
                    .env_map = std_map.get(),
                }) catch {};
            }

            Output.printStartEnd(ctx.start_time, std.time.nanoTimestamp());

            if (use_canary) {
                Output.prettyErrorln(
                    \\<r> Upgraded.
                    \\
                    \\<b><green>Welcome to Fun's latest canary build!<r>
                    \\
                    \\Report any bugs:
                    \\
                    \\    https://github.com/underdoc-org/fun/issues
                    \\
                    \\Changelog:
                    \\
                    \\    https://github.com/underdoc-org/fun/compare/{s}...{s}
                    \\
                ,
                    .{ Environment.git_sha_short, version.tag },
                );
            } else {
                const fun_v = "fun-v" ++ Global.package_json_version;

                Output.prettyErrorln(
                    \\<r> Upgraded.
                    \\
                    \\<b><green>Welcome to Fun v{s}!<r>
                    \\
                    \\What's new in Fun v{s}:
                    \\
                    \\    <cyan>https://fun.dev/blog/release-notes/{s}<r>
                    \\
                    \\Report any bugs:
                    \\
                    \\    https://github.com/underdoc-org/fun/issues
                    \\
                    \\Commit log:
                    \\
                    \\    https://github.com/underdoc-org/fun/compare/{s}...{s}
                    \\
                ,
                    .{ version_name, version_name, version.tag, fun_v, version.tag },
                );
            }

            Output.flush();

            if (Environment.isWindows) {
                if (outdated_filename) |to_remove| {
                    // TODO: this file gets left on disk
                    //
                    // We should remove it, however we cannot remove an exe that is still running.
                    // A prior approach was to spawn a subprocess to remove the file, but that
                    // would open a terminal window, which steals user focus (even if minimized).
                    _ = to_remove;
                }
            }
        }
    }
};

pub const upgrade_js_bindings = struct {
    const jsc = fun.jsc;
    const JSValue = jsc.JSValue;
    const ZigString = jsc.ZigString;

    var tempdir_fd: ?fun.FD = null;

    pub fn generate(global: *jsc.JSGlobalObject) jsc.JSValue {
        const obj = JSValue.createEmptyObject(global, 2);
        const open = ZigString.static("openTempDirWithoutSharingDelete");
        obj.put(global, open, jsc.JSFunction.create(global, "openTempDirWithoutSharingDelete", jsOpenTempDirWithoutSharingDelete, 1, .{}));
        const close = ZigString.static("closeTempDirHandle");
        obj.put(global, close, jsc.JSFunction.create(global, "closeTempDirHandle", jsCloseTempDirHandle, 1, .{}));
        return obj;
    }

    /// For testing upgrades when the temp directory has an open handle without FILE_SHARE_DELETE.
    /// Windows only
    pub fn jsOpenTempDirWithoutSharingDelete(_: *jsc.JSGlobalObject, _: *jsc.CallFrame) fun.JSError!fun.jsc.JSValue {
        if (comptime !Environment.isWindows) return .js_undefined;
        const w = std.os.windows;

        var buf: fun.WPathBuffer = undefined;
        const tmpdir_path = fs.FileSystem.RealFS.getDefaultTempDir();
        const path = switch (fun.sys.normalizePathWindows(u8, fun.invalid_fd, tmpdir_path, &buf, .{})) {
            .err => return .js_undefined,
            .result => |norm| norm,
        };

        const path_len_bytes: u16 = @truncate(path.len * 2);
        var nt_name = std.os.windows.UNICODE_STRING{
            .Length = path_len_bytes,
            .MaximumLength = path_len_bytes,
            .Buffer = @constCast(path.ptr),
        };

        var attr = std.os.windows.OBJECT_ATTRIBUTES{
            .Length = @sizeOf(std.os.windows.OBJECT_ATTRIBUTES),
            .RootDirectory = null,
            .Attributes = 0,
            .ObjectName = &nt_name,
            .SecurityDescriptor = null,
            .SecurityQualityOfService = null,
        };

        const flags: u32 = w.STANDARD_RIGHTS_READ | w.FILE_READ_ATTRIBUTES | w.FILE_READ_EA | w.SYNCHRONIZE | w.FILE_TRAVERSE;

        var fd: std.os.windows.HANDLE = std.os.windows.INVALID_HANDLE_VALUE;
        var io: std.os.windows.IO_STATUS_BLOCK = undefined;

        const rc = std.os.windows.ntdll.NtCreateFile(
            &fd,
            flags,
            &attr,
            &io,
            null,
            0,
            w.FILE_SHARE_READ | w.FILE_SHARE_WRITE,
            w.FILE_OPEN,
            w.FILE_DIRECTORY_FILE | w.FILE_SYNCHRONOUS_IO_NONALERT | w.FILE_OPEN_FOR_BACKUP_INTENT,
            null,
            0,
        );

        switch (fun.windows.Win32Error.fromNTStatus(rc)) {
            .SUCCESS => tempdir_fd = .fromNative(fd),
            else => {},
        }

        return .js_undefined;
    }

    pub fn jsCloseTempDirHandle(_: *jsc.JSGlobalObject, _: *jsc.CallFrame) fun.JSError!JSValue {
        if (comptime !Environment.isWindows) return .js_undefined;

        if (tempdir_fd) |fd| {
            fd.close();
        }

        return .js_undefined;
    }
};

pub fn @"export"() void {
    _ = &upgrade_js_bindings;
    Version.@"export"();
}

const string = []const u8;
const stringZ = [:0]const u8;

const DotEnv = @import("../dotenv/env_loader.zig");
const fs = @import("../resolver/fs.zig");
const linker = @import("../bundler/linker.zig");
const std = @import("std");
const Archive = @import("../libarchive/libarchive.zig").Archive;
const Command = @import("./cli.zig").Command;
const URL = @import("../url/url.zig").URL;
const which = @import("../which/which.zig").which;

const fun = @import("fun");
const Environment = fun.Environment;
const Global = fun.Global;
const JSON = fun.json;
const MutableString = fun.MutableString;
const Output = fun.Output;
const Progress = fun.Progress;
const default_allocator = fun.default_allocator;
const js_ast = fun.ast;
const logger = fun.logger;
const strings = fun.strings;

const HTTP = fun.http;
const Headers = fun.http.Headers;
