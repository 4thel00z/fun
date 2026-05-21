const debug = Output.scoped(.funx, .visible);

pub const FunxCommand = struct {
    var path_buf: fun.PathBuffer = undefined;

    /// funx-specific options parsed from argv.
    const Options = struct {
        /// CLI arguments to pass to the command being run.
        passthrough_list: std.ArrayListUnmanaged(string) = .{},
        /// `funx <package_name>`
        package_name: string,
        /// The binary name to run (when using --package)
        binary_name: ?string = null,
        /// The package to install (when using --package)
        specified_package: ?string = null,
        // `--silent` and `--verbose` are not mutually exclusive. Both the
        // global CLI parser and `fun add` parser use them for different
        // purposes.
        verbose_install: bool = false,
        silent_install: bool = false,
        /// Skip installing the package, only running the target command if its
        /// already downloaded. If its not, `funx` exits with an error.
        no_install: bool = false,
        allocator: Allocator,

        /// Create a new `Options` instance by parsing CLI arguments. `ctx` may be mutated.
        ///
        /// ## Exits
        /// - `--revision` or `--version` flags are passed without a target
        ///   command also being provided. This is not a failure.
        /// - Incorrect arguments are passed. Prints usage and exits with a failure code.
        fn parse(ctx: fun.cli.Command.Context, argv: [][:0]const u8) Allocator.Error!Options {
            var found_subcommand_name = false;
            var maybe_package_name: ?string = null;
            var has_version = false; //  --version
            var has_revision = false; // --revision
            var i: usize = 0;

            // SAFETY: `opts` is only ever returned when a package name is found, otherwise the process exits.
            var opts = Options{ .package_name = undefined, .allocator = ctx.allocator };
            try opts.passthrough_list.ensureTotalCapacityPrecise(opts.allocator, argv.len);

            while (i < argv.len) : (i += 1) {
                const positional = argv[i];

                if (maybe_package_name != null) {
                    opts.passthrough_list.appendAssumeCapacity(positional);
                    continue;
                }

                if (positional.len > 0 and positional[0] == '-') {
                    if (strings.eqlComptime(positional, "--version") or strings.eqlComptime(positional, "-v")) {
                        has_version = true;
                    } else if (strings.eqlComptime(positional, "--revision")) {
                        has_revision = true;
                    } else if (strings.eqlComptime(positional, "--verbose")) {
                        opts.verbose_install = true;
                    } else if (strings.eqlComptime(positional, "--silent")) {
                        opts.silent_install = true;
                    } else if (strings.eqlComptime(positional, "--fun") or strings.eqlComptime(positional, "-b")) {
                        ctx.debug.run_in_fun = true;
                    } else if (strings.eqlComptime(positional, "--no-install")) {
                        opts.no_install = true;
                    } else if (strings.eqlComptime(positional, "--package") or strings.eqlComptime(positional, "-p")) {
                        // Next argument should be the package name
                        i += 1;
                        if (i >= argv.len) {
                            Output.errGeneric("--package requires a package name", .{});
                            Global.exit(1);
                        }
                        if (argv[i].len == 0) {
                            Output.errGeneric("--package requires a non-empty package name", .{});
                            Global.exit(1);
                        }
                        opts.specified_package = argv[i];
                    } else if (strings.hasPrefixComptime(positional, "--package=")) {
                        const package_value = positional["--package=".len..];
                        if (package_value.len == 0) {
                            Output.errGeneric("--package requires a non-empty package name", .{});
                            Global.exit(1);
                        }
                        opts.specified_package = package_value;
                    } else if (strings.hasPrefixComptime(positional, "-p=")) {
                        const package_value = positional["-p=".len..];
                        if (package_value.len == 0) {
                            Output.errGeneric("--package requires a non-empty package name", .{});
                            Global.exit(1);
                        }
                        opts.specified_package = package_value;
                    }
                } else {
                    if (!found_subcommand_name) {
                        found_subcommand_name = true;
                    } else {
                        maybe_package_name = positional;
                    }
                }
            }

            // Handle --package flag case differently
            if (opts.specified_package != null) {
                if (maybe_package_name) |package_name| {
                    if (package_name.len == 0) {
                        Output.errGeneric("When using --package, you must specify the binary to run", .{});
                        Output.prettyln("  <d>usage: funx --package=\\<package-name\\> \\<binary-name\\> [args...]<r>", .{});
                        Global.exit(1);
                    }
                } else {
                    Output.errGeneric("When using --package, you must specify the binary to run", .{});
                    Output.prettyln("  <d>usage: funx --package=\\<package-name\\> \\<binary-name\\> [args...]<r>", .{});
                    Global.exit(1);
                }
                opts.binary_name = maybe_package_name;
                opts.package_name = opts.specified_package.?;
            } else {
                // Normal case: package_name is the first non-flag argument
                if (maybe_package_name == null or maybe_package_name.?.len == 0) {
                    // no need to free memory b/c we're exiting
                    if (has_revision) {
                        cli.printRevisionAndExit();
                    } else if (has_version) {
                        cli.printVersionAndExit();
                    } else {
                        exitWithUsage();
                    }
                }
                opts.package_name = maybe_package_name.?;
            }
            return opts;
        }

        fn deinit(self: *Options) void {
            self.passthrough_list.deinit(self.allocator);
            self.* = undefined;
        }
    };

    /// Adds `create-` to the string, but also handles scoped packages correctly.
    /// Always clones the string in the process.
    pub fn addCreatePrefix(allocator: std.mem.Allocator, input: []const u8) ![:0]const u8 {
        const prefixLength = "create-".len;

        if (input.len == 0) return try allocator.dupeZ(u8, input);

        var new_str = try allocator.allocSentinel(u8, input.len + prefixLength, 0);
        if (input[0] == '@') {
            // @org/some -> @org/create-some
            // @org/some@v -> @org/create-some@v
            if (strings.indexOfChar(input, '/')) |slash_i| {
                const index = slash_i + 1;
                @memcpy(new_str[0..index], input[0..index]);
                @memcpy(new_str[index .. index + prefixLength], "create-");
                @memcpy(new_str[index + prefixLength ..], input[index..]);
                return new_str;
            }
            // @org@v -> @org/create@v
            else if (strings.indexOfChar(input[1..], '@')) |at_i| {
                const index = at_i + 1;
                @memcpy(new_str[0..index], input[0..index]);
                @memcpy(new_str[index .. index + prefixLength], "/create");
                @memcpy(new_str[index + prefixLength ..], input[index..]);
                return new_str;
            }
            // @org -> @org/create
            else {
                @memcpy(new_str[0..input.len], input);
                @memcpy(new_str[input.len..], "/create");
                return new_str;
            }
        }

        @memcpy(new_str[0..prefixLength], "create-");
        @memcpy(new_str[prefixLength..], input);

        return new_str;
    }

    /// 1 day
    const seconds_cache_valid = 60 * 60 * 24;
    /// 1 day
    const nanoseconds_cache_valid = seconds_cache_valid * 1000000000;

    fn getBinNameFromSubpath(transpiler: *fun.Transpiler, dir_fd: fun.FD, subpath_z: [:0]const u8) ![]const u8 {
        const target_package_json_fd = try fun.sys.openat(dir_fd, subpath_z, fun.O.RDONLY, 0).unwrap();
        const target_package_json = fun.sys.File{ .handle = target_package_json_fd };

        defer target_package_json.close();

        const package_json_read = target_package_json.readToEnd(transpiler.allocator);

        // TODO: make this better
        if (package_json_read.err) |err| {
            try (fun.sys.Maybe(void){ .err = err }).unwrap();
        }

        const package_json_contents = package_json_read.bytes.items;
        const source = &fun.logger.Source.initPathString(fun.span(subpath_z), package_json_contents);

        fun.ast.Expr.Data.Store.create();
        fun.ast.Stmt.Data.Store.create();

        const expr = try fun.json.parsePackageJSONUTF8(source, transpiler.log, transpiler.allocator);

        // choose the first package that fits
        if (expr.get("bin")) |bin_expr| {
            switch (bin_expr.data) {
                .e_object => |object| {
                    for (object.properties.slice()) |prop| {
                        if (prop.key) |key| {
                            if (key.asString(transpiler.allocator)) |bin_name| {
                                if (bin_name.len == 0) continue;
                                return bin_name;
                            }
                        }
                    }
                },
                .e_string => {
                    if (expr.get("name")) |name_expr| {
                        if (name_expr.asString(transpiler.allocator)) |name| {
                            return name;
                        }
                    }
                },
                else => {},
            }
        }

        if (expr.asProperty("directories")) |dirs| {
            if (dirs.expr.asProperty("bin")) |bin_prop| {
                if (bin_prop.expr.asString(transpiler.allocator)) |dir_name| {
                    const bin_dir = try fun.sys.openatA(dir_fd, dir_name, fun.O.RDONLY | fun.O.DIRECTORY, 0).unwrap();
                    defer bin_dir.close();
                    var iterator = fun.DirIterator.iterate(bin_dir, .u8);
                    var entry = iterator.next();
                    while (true) : (entry = iterator.next()) {
                        const current = switch (entry) {
                            .err => break,
                            .result => |result| result,
                        } orelse break;

                        if (current.kind == .file) {
                            if (current.name.len == 0) continue;
                            return try transpiler.allocator.dupe(u8, current.name.slice());
                        }
                    }
                }
            }
        }

        return error.NoBinFound;
    }

    fn getBinNameFromProjectDirectory(transpiler: *fun.Transpiler, dir_fd: fun.FD, package_name: []const u8) ![]const u8 {
        var subpath: fun.PathBuffer = undefined;
        const subpath_z = std.fmt.bufPrintZ(&subpath, fun.pathLiteral("node_modules/{s}/package.json"), .{package_name}) catch unreachable;
        return try getBinNameFromSubpath(transpiler, dir_fd, subpath_z);
    }

    fn getBinNameFromTempDirectory(transpiler: *fun.Transpiler, tempdir_name: []const u8, package_name: []const u8, with_stale_check: bool) ![]const u8 {
        var subpath: fun.PathBuffer = undefined;
        if (with_stale_check) {
            const subpath_z = std.fmt.bufPrintZ(
                &subpath,
                fun.pathLiteral("{s}/package.json"),
                .{tempdir_name},
            ) catch unreachable;
            const target_package_json_fd = fun.sys.openat(fun.FD.cwd(), subpath_z, fun.O.RDONLY, 0).unwrap() catch return error.NeedToInstall;
            const target_package_json = fun.sys.File{ .handle = target_package_json_fd };

            const is_stale = is_stale: {
                if (Environment.isWindows) {
                    var io_status_block: std.os.windows.IO_STATUS_BLOCK = undefined;
                    var info: std.os.windows.FILE_BASIC_INFORMATION = undefined;
                    const rc = std.os.windows.ntdll.NtQueryInformationFile(target_package_json_fd.cast(), &io_status_block, &info, @sizeOf(std.os.windows.FILE_BASIC_INFORMATION), .FileBasicInformation);
                    switch (rc) {
                        .SUCCESS => {
                            const time = std.os.windows.fromSysTime(info.LastWriteTime);
                            const now = std.time.nanoTimestamp();
                            break :is_stale (now - time > nanoseconds_cache_valid);
                        },
                        // treat failures to stat as stale
                        else => break :is_stale true,
                    }
                } else {
                    const stat = target_package_json.stat().unwrap() catch break :is_stale true;
                    break :is_stale std.time.timestamp() - stat.mtime().sec > seconds_cache_valid;
                }
            };

            if (is_stale) {
                _ = target_package_json.close();
                // If delete fails, oh well. Hope installation takes care of it.
                std.fs.cwd().deleteTree(tempdir_name) catch {};
                return error.NeedToInstall;
            }
            _ = target_package_json.close();
        }

        const subpath_z = std.fmt.bufPrintZ(
            &subpath,
            fun.pathLiteral("{s}/node_modules/{s}/package.json"),
            .{ tempdir_name, package_name },
        ) catch unreachable;

        return try getBinNameFromSubpath(transpiler, fun.FD.cwd(), subpath_z);
    }

    /// Check the enclosing package.json for a matching "bin"
    /// If not found, check funx cache dir
    fn getBinName(transpiler: *fun.Transpiler, toplevel_fd: fun.FD, tempdir_name: []const u8, package_name: []const u8) error{ NoBinFound, NeedToInstall }![]const u8 {
        fun.assert(toplevel_fd.isValid());
        return getBinNameFromProjectDirectory(transpiler, toplevel_fd, package_name) catch |err| {
            if (err == error.NoBinFound) {
                return error.NoBinFound;
            }

            return getBinNameFromTempDirectory(transpiler, tempdir_name, package_name, true) catch |err2| {
                if (err2 == error.NoBinFound) {
                    return error.NoBinFound;
                }

                return error.NeedToInstall;
            };
        };
    }

    fn exitWithUsage() noreturn {
        Command.Tag.printHelp(.FunxCommand, false);
        Global.exit(1);
    }

    pub fn exec(ctx: fun.cli.Command.Context, argv: [][:0]const u8) !void {
        // Don't log stuff
        ctx.debug.silent = true;

        var opts = try Options.parse(ctx, argv);
        defer opts.deinit();

        var requests_buf = fun.handleOom(UpdateRequest.Array.initCapacity(ctx.allocator, 64));
        defer requests_buf.deinit(ctx.allocator);
        const update_requests = UpdateRequest.parse(
            ctx.allocator,
            null,
            ctx.log,
            &.{opts.package_name},
            &requests_buf,
            .add,
        );

        if (update_requests.len == 0) {
            exitWithUsage();
        }

        fun.assert(update_requests.len == 1); // One positional cannot parse to multiple requests
        var update_request = update_requests[0];

        // if you type "tsc" and TypeScript is not installed:
        // 1. Install TypeScript
        // 2. Run tsc
        // BUT: Skip this transformation if --package was explicitly specified
        if (opts.specified_package == null) {
            if (strings.eqlComptime(update_request.name, "tsc")) {
                update_request.name = "typescript";
            } else if (strings.eqlComptime(update_request.name, "claude")) {
                // The npm package "claude" is an unrelated squatter with no bin;
                // `funx claude` is much more likely to mean the actual CLI.
                update_request.name = "@anthropic-ai/claude-code";
            }
        }

        // When the user types a scoped package like `@foo/bar`, the initial bin
        // name ("bar") is only a guess — the package's actual bin may be named
        // something else entirely. In that case we must not search the original
        // system $PATH with the guessed name, or we may match an unrelated system
        // binary (e.g. `funx @uidotsh/install` would otherwise run /usr/bin/install).
        // We still search local node_modules/.bin directories, since many scoped
        // packages do link their bin under the unscoped name.
        //
        // Only the branch that strips the scope from the package name is a guess;
        // explicit `--package` bins and hardcoded aliases like `tsc`/`claude` are
        // known-good bin names and should still be searchable in the system $PATH.
        var initial_bin_name_is_a_guess = false;
        const initial_bin_name = if (opts.binary_name) |bin_name|
            bin_name
        else if (strings.eqlComptime(update_request.name, "typescript"))
            "tsc"
        else if (strings.eqlComptime(update_request.name, "@anthropic-ai/claude-code"))
            "claude"
        else if (update_request.version.tag == .github)
            update_request.version.value.github.repo.slice(update_request.version_buf)
        else if (strings.lastIndexOfChar(update_request.name, '/')) |index| blk: {
            initial_bin_name_is_a_guess = true;
            break :blk update_request.name[index + 1 ..];
        } else update_request.name;
        debug("initial_bin_name: {s}", .{initial_bin_name});

        // fast path: they're actually using this interchangeably with `fun run`
        // so we use Fun.which to check
        // SAFETY: initialized by Run.configureEnvForRun
        var this_transpiler: fun.Transpiler = undefined;
        var ORIGINAL_PATH: string = "";

        const root_dir_info = try Run.configureEnvForRun(
            ctx,
            &this_transpiler,
            null,
            true,
            true,
        );

        try Run.configurePathForRun(
            ctx,
            root_dir_info,
            &this_transpiler,
            &ORIGINAL_PATH,
            root_dir_info.abs_path,
            ctx.debug.run_in_fun,
        );
        this_transpiler.env.map.put("npm_command", "exec") catch unreachable;
        this_transpiler.env.map.put("npm_lifecycle_event", "funx") catch unreachable;
        this_transpiler.env.map.put("npm_lifecycle_script", opts.package_name) catch unreachable;

        if (strings.eqlComptime(opts.package_name, "fun-repl")) {
            this_transpiler.env.map.remove("FUN_INSPECT_CONNECT_TO");
            this_transpiler.env.map.remove("FUN_INSPECT_NOTIFY");
            this_transpiler.env.map.remove("FUN_INSPECT");
        }

        const ignore_cwd = this_transpiler.env.get("FUN_WHICH_IGNORE_CWD") orelse "";

        if (ignore_cwd.len > 0) {
            _ = this_transpiler.env.map.map.swapRemove("FUN_WHICH_IGNORE_CWD");
        }

        var PATH = this_transpiler.env.get("PATH").?;

        // `configurePathForRun` builds PATH by appending ORIGINAL_PATH to a set of
        // `*/node_modules/.bin` directories (plus the fun-node shim dir). Capture just
        // that prepended portion here — it is used below to search for guessed bin
        // names without risking a collision with an unrelated binary in the user's
        // system $PATH. A trailing delimiter may remain; `fun.which` tokenizes on the
        // delimiter so empty segments are ignored.
        const local_bin_dirs: []const u8 = if (ORIGINAL_PATH.len > 0 and
            strings.endsWith(PATH, ORIGINAL_PATH))
            PATH[0 .. PATH.len - ORIGINAL_PATH.len]
        else
            PATH;

        const display_version = if (update_request.version.literal.isEmpty())
            "latest"
        else
            update_request.version.literal.slice(update_request.version_buf);

        // package_fmt is used for the path to install in.
        const package_fmt = brk: {
            // Includes the delimiters because we use this as a part of $PATH
            const banned_path_chars = switch (Environment.os) {
                .windows => ":*?<>|;",
                else => ":",
            };

            const has_banned_char = strings.indexAnyComptime(update_request.name, banned_path_chars) != null or strings.indexAnyComptime(display_version, banned_path_chars) != null;

            break :brk try if (has_banned_char)
                // This branch gets hit usually when a URL is requested as the package
                // See https://github.com/underdoc-org/fun/issues/3675
                //
                // But the requested version will contain the url.
                // The colon will break all platforms.
                std.fmt.allocPrint(ctx.allocator, "{s}@{s}@{d}", .{
                    initial_bin_name,
                    @tagName(update_request.version.tag),
                    fun.hash(update_request.name) +% fun.hash(display_version),
                })
            else
                try std.fmt.allocPrint(ctx.allocator, "{s}@{s}", .{
                    update_request.name,
                    display_version,
                });
        };
        debug("package_fmt: {s}", .{package_fmt});

        // install_param -> used in command 'fun install {what}'
        // result_package_name -> used for path 'node_modules/{what}/package.json'
        const install_param, const result_package_name = if (update_request.name.len != 0)
            .{
                try std.fmt.allocPrint(ctx.allocator, "{s}@{s}", .{
                    update_request.name,
                    display_version,
                }),
                update_request.name,
            }
        else
            // When there is not a clear package name (URL/GitHub/etc), we force the package name
            // to be the same as the calculated initial bin name. This allows us to have a predictable
            // node_modules folder structure.
            .{
                try std.fmt.allocPrint(ctx.allocator, "{s}@{s}", .{
                    initial_bin_name,
                    display_version,
                }),
                initial_bin_name,
            };
        debug("install_param: {s}", .{install_param});
        debug("result_package_name: {s}", .{result_package_name});

        const temp_dir = fun.fs.FileSystem.RealFS.platformTempDir();

        const PATH_FOR_BIN_DIRS = brk: {
            if (ignore_cwd.len == 0) break :brk PATH;

            // Remove the cwd passed through FUN_WHICH_IGNORE_CWD from path. This prevents temp node-gyp script from finding and running itself
            var new_path = try std.array_list.Managed(u8).initCapacity(ctx.allocator, PATH.len);
            var path_iter = std.mem.tokenizeScalar(u8, PATH, std.fs.path.delimiter);
            if (path_iter.next()) |segment| {
                if (!strings.eqlLong(strings.withoutTrailingSlash(segment), strings.withoutTrailingSlash(ignore_cwd), true)) {
                    try new_path.appendSlice(segment);
                }
            }
            while (path_iter.next()) |segment| {
                if (!strings.eqlLong(strings.withoutTrailingSlash(segment), strings.withoutTrailingSlash(ignore_cwd), true)) {
                    try new_path.append(std.fs.path.delimiter);
                    try new_path.appendSlice(segment);
                }
            }

            break :brk new_path.items;
        };
        defer if (ignore_cwd.len > 0) {
            ctx.allocator.free(PATH_FOR_BIN_DIRS);
        };

        // The funx cache path is at the following location
        //
        //   <temp_dir>/funx-<uid>-<package_fmt>/node_modules/.bin/<bin>
        //
        // Reasoning:
        // - Prefix with "funx" to identify the funx cache, make it easier to "rm -r"
        //   - Suffix would not work because scoped packages have a "/" in them, and
        //     before Fun 1.1 this was practically impossible to clear the cache manually.
        //     It was easier to just remove the entire temp directory.
        // - Use the uid to prevent conflicts between users. If the paths were the same
        //   across users, you run into permission conflicts
        //   - If you set permission to 777, you run into a potential attack vector
        //     where a user can replace the directory with malicious code.
        //
        // If this format changes, please update cache clearing code in package_manager_command.zig
        const uid = if (fun.Environment.isPosix) fun.c.getuid() else fun.windows.userUniqueId();
        PATH = switch (PATH.len > 0) {
            inline else => |path_is_nonzero| try std.fmt.allocPrint(
                ctx.allocator,
                fun.pathLiteral("{s}/funx-{d}-{s}/node_modules/.bin{s}{s}"),
                .{
                    temp_dir,
                    uid,
                    package_fmt,
                    if (path_is_nonzero) &[1]u8{std.fs.path.delimiter} else "",
                    if (path_is_nonzero) PATH else "",
                },
            ),
        };

        try this_transpiler.env.map.put("PATH", PATH);
        const funx_cache_dir = PATH[0 .. temp_dir.len +
            "/funx--".len +
            package_fmt.len +
            std.fmt.count("{d}", .{uid})];

        debug("funx_cache_dir: {s}", .{funx_cache_dir});

        var absolute_in_cache_dir_buf: fun.PathBuffer = undefined;
        var absolute_in_cache_dir = std.fmt.bufPrint(
            &absolute_in_cache_dir_buf,
            fun.pathLiteral("{s}/node_modules/.bin/{s}{s}"),
            .{ funx_cache_dir, initial_bin_name, fun.exe_suffix },
        ) catch return error.PathTooLong;

        const passthrough = opts.passthrough_list.items;

        var do_cache_bust = update_request.version.tag == .dist_tag;
        const look_for_existing_bin = update_request.version.literal.isEmpty() or update_request.version.tag != .dist_tag;

        debug("try run existing? {}", .{look_for_existing_bin});
        if (look_for_existing_bin) try_run_existing: {
            var destination_: ?[:0]const u8 = null;

            // Only use the system-installed version if there is no version specified
            if (update_request.version.literal.isEmpty()) {
                // If the bin name is a guess derived from a scoped package name,
                // exclude the original system $PATH so we don't match unrelated
                // system binaries. Only search local node_modules/.bin directories.
                destination_ = fun.which(
                    &path_buf,
                    if (initial_bin_name_is_a_guess) local_bin_dirs else PATH_FOR_BIN_DIRS,
                    if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
                    initial_bin_name,
                );
            }

            // Similar to "npx":
            //
            //  1. Try the bin in the current node_modules and then we try the bin in the global cache
            if (destination_ orelse fun.which(
                &path_buf,
                funx_cache_dir,
                if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
                absolute_in_cache_dir,
            )) |destination| {
                const out = fun.asByteSlice(destination);

                // If this directory was installed by funx, we want to perform cache invalidation on it
                // this way running `funx hello` will update hello automatically to the latest version
                if (fun.strings.hasPrefix(out, funx_cache_dir)) {
                    const is_stale = is_stale: {
                        if (Environment.isWindows) {
                            const fd = fun.sys.openat(.cwd(), destination, fun.O.RDONLY, 0).unwrap() catch {
                                // if we cant open this, we probably will just fail when we run it
                                // and that error message is likely going to be better than the one from `fun add`
                                break :is_stale false;
                            };
                            defer fd.close();

                            var io_status_block: std.os.windows.IO_STATUS_BLOCK = undefined;
                            var info: std.os.windows.FILE_BASIC_INFORMATION = undefined;
                            const rc = std.os.windows.ntdll.NtQueryInformationFile(fd.cast(), &io_status_block, &info, @sizeOf(std.os.windows.FILE_BASIC_INFORMATION), .FileBasicInformation);
                            switch (rc) {
                                .SUCCESS => {
                                    const time = std.os.windows.fromSysTime(info.LastWriteTime);
                                    const now = std.time.nanoTimestamp();
                                    break :is_stale (now - time > nanoseconds_cache_valid);
                                },
                                // treat failures to stat as stale
                                else => break :is_stale true,
                            }
                        } else {
                            var stat: std.posix.Stat = undefined;
                            const rc = std.c.stat(destination, &stat);
                            if (rc != 0) {
                                break :is_stale true;
                            }
                            break :is_stale std.time.timestamp() - stat.mtime().sec > seconds_cache_valid;
                        }
                    };

                    if (is_stale) {
                        debug("found stale binary: {s}", .{out});
                        do_cache_bust = true;
                        if (opts.no_install) {
                            Output.warn("Using a stale installation of <b>{s}<r> because --no-install was passed. Run `funx` without --no-install to use a fresh binary.", .{update_request.name});
                        } else {
                            break :try_run_existing;
                        }
                    }
                }

                debug("running existing binary: {s}", .{destination});
                try Run.runBinary(
                    ctx,
                    try this_transpiler.fs.dirname_store.append(@TypeOf(out), out),
                    destination,
                    this_transpiler.fs.top_level_dir,
                    this_transpiler.env,
                    passthrough,
                    null,
                );
                // runBinary is noreturn
                @compileError("unreachable");
            }

            // 2. The "bin" is possibly not the same as the package name, so we load the package.json to figure out what "bin" to use
            // BUT: Skip this if --package was used, as the user explicitly specified the binary name
            const root_dir_fd = root_dir_info.getFileDescriptor();
            fun.assert(root_dir_fd.isValid());
            if (opts.binary_name == null) {
                if (getBinName(&this_transpiler, root_dir_fd, funx_cache_dir, result_package_name)) |package_name_for_bin| {
                    // if we check the bin name and its actually the same, we don't need to check $PATH here again
                    if (!strings.eqlLong(package_name_for_bin, initial_bin_name, true)) {
                        absolute_in_cache_dir = std.fmt.bufPrint(&absolute_in_cache_dir_buf, fun.pathLiteral("{s}/node_modules/.bin/{s}{s}"), .{ funx_cache_dir, package_name_for_bin, fun.exe_suffix }) catch unreachable;

                        // Only use the system-installed version if there is no version specified.
                        // `package_name_for_bin` is the real bin name from the target package's
                        // own package.json. Search only local node_modules/.bin directories for
                        // it — not the system $PATH, because the real bin name may itself collide
                        // with an unrelated system binary when the package lives only in the funx
                        // cache (handled by the `orelse` absolute-path probe below) and not in a
                        // local node_modules.
                        if (update_request.version.literal.isEmpty()) {
                            destination_ = fun.which(
                                &path_buf,
                                local_bin_dirs,
                                if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
                                package_name_for_bin,
                            );
                        }

                        if (destination_ orelse fun.which(
                            &path_buf,
                            funx_cache_dir,
                            if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
                            absolute_in_cache_dir,
                        )) |destination| {
                            const out = fun.asByteSlice(destination);
                            try Run.runBinary(
                                ctx,
                                try this_transpiler.fs.dirname_store.append(@TypeOf(out), out),
                                destination,
                                this_transpiler.fs.top_level_dir,
                                this_transpiler.env,
                                passthrough,
                                null,
                            );
                            // runBinary is noreturn
                            @compileError("unreachable");
                        }
                    }
                } else |err| {
                    if (err == error.NoBinFound) {
                        if (opts.specified_package != null and opts.binary_name != null) {
                            Output.errGeneric("Package <b>{s}<r> does not provide a binary named <b>{s}<r>", .{ update_request.name, opts.binary_name.? });
                            Output.prettyln("  <d>hint: try running without --package to install and run {s} directly<r>", .{opts.binary_name.?});
                        } else {
                            Output.errGeneric("could not determine executable to run for package <b>{s}<r>", .{update_request.name});
                        }
                        Global.exit(1);
                    }
                }
            }
        }
        // If we've reached this point, it means we couldn't find an existing binary to run.
        // Next step is to install, then run it.

        // NOTE: npx prints errors like this:
        //
        //     npm error npx canceled due to missing packages and no YES option: ["foo@1.2.3"]
        //     npm error A complete log of this run can be found in: [folder]/debug.log
        //
        // Which is not very helpful.

        if (opts.no_install) {
            Output.errGeneric(
                "Could not find an existing '{s}' binary to run. Stopping because --no-install was passed.",
                .{initial_bin_name},
            );
            Global.exit(1);
        }

        const funx_install_dir = try std.fs.cwd().makeOpenPath(funx_cache_dir, .{});

        create_package_json: {
            // create package.json, but only if it doesn't exist
            var package_json = funx_install_dir.createFileZ("package.json", .{ .truncate = true }) catch break :create_package_json;
            defer package_json.close();
            package_json.writeAll("{}\n") catch {};
        }

        var args = fun.BoundedArray([]const u8, 8).fromSlice(&.{
            try fun.selfExePath(),
            "add",
            install_param,
            "--no-summary",
        }) catch
            unreachable; // upper bound is known

        if (do_cache_bust) {
            // disable the manifest cache when a tag is specified
            // so that @latest is fetched from the registry
            args.append("--no-cache") catch
                unreachable; // upper bound is known

            // forcefully re-install packages in this mode too
            args.append("--force") catch
                unreachable; // upper bound is known
        }

        if (opts.verbose_install) {
            args.append("--verbose") catch
                unreachable; // upper bound is known
        }

        if (opts.silent_install) {
            args.append("--silent") catch
                unreachable; // upper bound is known
        }

        const argv_to_use = args.slice();

        debug("installing package: {f}", .{fun.fmt.fmtSlice(argv_to_use, " ")});
        fun.handleOom(this_transpiler.env.map.put("FUN_INTERNAL_FUNX_INSTALL", "true"));

        const spawn_result = switch ((fun.spawnSync(&.{
            .argv = argv_to_use,

            .envp = try this_transpiler.env.map.createNullDelimitedEnvMap(fun.default_allocator),

            .cwd = funx_cache_dir,
            .stderr = .inherit,
            .stdout = .inherit,
            .stdin = .inherit,

            .windows = if (Environment.isWindows) .{
                .loop = fun.jsc.EventLoopHandle.init(fun.jsc.MiniEventLoop.initGlobal(this_transpiler.env, null)),
            },
        }) catch |err| {
            Output.prettyErrorln("<r><red>error<r>: funx failed to install <b>{s}<r> due to error <b>{s}<r>", .{ install_param, @errorName(err) });
            Global.exit(1);
        })) {
            .err => |err| {
                _ = err; // autofix
                Global.exit(1);
            },
            .result => |result| result,
        };

        switch (spawn_result.status) {
            .exited => |exit| {
                if (exit.signal.valid()) {
                    if (fun.feature_flag.FUN_INTERNAL_SUPPRESS_CRASH_IN_FUN_RUN.get()) {
                        fun.crash_handler.suppressReporting();
                    }

                    Global.raiseIgnoringPanicHandler(exit.signal);
                }

                if (exit.code != 0) {
                    Global.exit(exit.code);
                }
            },
            .signaled => |signal| {
                if (fun.feature_flag.FUN_INTERNAL_SUPPRESS_CRASH_IN_FUN_RUN.get()) {
                    fun.crash_handler.suppressReporting();
                }

                Global.raiseIgnoringPanicHandler(signal);
            },
            .err => |err| {
                Output.prettyErrorln("<r><red>error<r>: funx failed to install <b>{s}<r> due to error:\n{f}", .{ install_param, err });
                Global.exit(1);
            },
            else => {},
        }

        absolute_in_cache_dir = std.fmt.bufPrint(&absolute_in_cache_dir_buf, fun.pathLiteral("{s}/node_modules/.bin/{s}{s}"), .{ funx_cache_dir, initial_bin_name, fun.exe_suffix }) catch unreachable;

        // Similar to "npx":
        //
        //  1. Try the bin in the global cache
        //     Do not try $PATH because we already checked it above if we should
        if (fun.which(
            &path_buf,
            funx_cache_dir,
            if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
            absolute_in_cache_dir,
        )) |destination| {
            const out = fun.asByteSlice(destination);
            try Run.runBinary(
                ctx,
                try this_transpiler.fs.dirname_store.append(@TypeOf(out), out),
                destination,
                this_transpiler.fs.top_level_dir,
                this_transpiler.env,
                passthrough,
                null,
            );
            // runBinary is noreturn
            @compileError("unreachable");
        }

        // 2. The "bin" is possibly not the same as the package name, so we load the package.json to figure out what "bin" to use
        // BUT: Skip this if --package was used, as the user explicitly specified the binary name
        if (opts.binary_name == null) {
            if (getBinNameFromTempDirectory(&this_transpiler, funx_cache_dir, result_package_name, false)) |package_name_for_bin| {
                if (!strings.eqlLong(package_name_for_bin, initial_bin_name, true)) {
                    absolute_in_cache_dir = std.fmt.bufPrint(&absolute_in_cache_dir_buf, "{s}/node_modules/.bin/{s}{s}", .{ funx_cache_dir, package_name_for_bin, fun.exe_suffix }) catch unreachable;

                    if (fun.which(
                        &path_buf,
                        funx_cache_dir,
                        if (ignore_cwd.len > 0) "" else this_transpiler.fs.top_level_dir,
                        absolute_in_cache_dir,
                    )) |destination| {
                        const out = fun.asByteSlice(destination);
                        try Run.runBinary(
                            ctx,
                            try this_transpiler.fs.dirname_store.append(@TypeOf(out), out),
                            destination,
                            this_transpiler.fs.top_level_dir,
                            this_transpiler.env,
                            passthrough,
                            null,
                        );
                        // runBinary is noreturn
                        @compileError("unreachable");
                    }
                }
            } else |_| {}
        }

        if (opts.specified_package != null and opts.binary_name != null) {
            Output.errGeneric("Package <b>{s}<r> does not provide a binary named <b>{s}<r>", .{ update_request.name, opts.binary_name.? });
            Output.prettyln("  <d>hint: try running without --package to install and run {s} directly<r>", .{opts.binary_name.?});
        } else {
            Output.errGeneric("could not determine executable to run for package <b>{s}<r>", .{update_request.name});
        }
        Global.exit(1);
    }
};

const string = []const u8;

const std = @import("std");
const Run = @import("./run_command.zig").RunCommand;
const Allocator = std.mem.Allocator;

const cli = @import("./cli.zig");
const Command = cli.Command;

const fun = @import("fun");
const Environment = fun.Environment;
const Global = fun.Global;
const Output = fun.Output;
const default_allocator = fun.default_allocator;
const strings = fun.strings;
const UpdateRequest = fun.PackageManager.UpdateRequest;
