pub const FileCopier = struct {
    src_path: fun.AbsPath(.{ .sep = .auto, .unit = .os }),
    dest_subpath: fun.Path(.{ .sep = .auto, .unit = .os }),
    walker: Walker,

    pub fn init(
        src_dir: FD,
        src_path: fun.AbsPath(.{ .sep = .auto, .unit = .os }),
        dest_subpath: fun.Path(.{ .sep = .auto, .unit = .os }),
        skip_dirnames: []const fun.OSPathSlice,
    ) OOM!FileCopier {
        return .{
            .src_path = src_path,
            .dest_subpath = dest_subpath,
            .walker = walker: {
                var w = try Walker.walk(
                    src_dir,
                    fun.default_allocator,
                    &.{},
                    skip_dirnames,
                );
                w.resolve_unknown_entry_types = true;
                break :walker w;
            },
        };
    }

    pub fn deinit(this: *FileCopier) void {
        this.walker.deinit();
    }

    pub fn copy(this: *FileCopier) sys.Maybe(void) {
        var dest_dir = fun.MakePath.makeOpenPath(FD.cwd().stdDir(), this.dest_subpath.sliceZ(), .{}) catch |err| {
            // TODO: remove the need for this and implement openDir makePath makeOpenPath in fun
            var errno: fun.sys.E = switch (@as(anyerror, err)) {
                error.AccessDenied => .PERM,
                error.FileTooBig => .FBIG,
                error.SymLinkLoop => .LOOP,
                error.ProcessFdQuotaExceeded => .NFILE,
                error.NameTooLong => .NAMETOOLONG,
                error.SystemFdQuotaExceeded => .MFILE,
                error.SystemResources => .NOMEM,
                error.ReadOnlyFileSystem => .ROFS,
                error.FileSystem => .IO,
                error.FileBusy => .BUSY,
                error.DeviceBusy => .BUSY,

                // One of the path components was not a directory.
                // This error is unreachable if `sub_path` does not contain a path separator.
                error.NotDir => .NOTDIR,
                // On Windows, file paths must be valid Unicode.
                error.InvalidUtf8 => .INVAL,
                error.InvalidWtf8 => .INVAL,

                // On Windows, file paths cannot contain these characters:
                // '/', '*', '?', '"', '<', '>', '|'
                error.BadPathName => .INVAL,

                error.FileNotFound => .NOENT,
                error.IsDir => .ISDIR,

                else => .FAULT,
            };
            if (Environment.isWindows and errno == .NOTDIR) {
                errno = .NOENT;
            }

            return .{ .err = fun.sys.Error.fromCode(errno, .copyfile) };
        };
        defer dest_dir.close();

        var copy_file_state: fun.CopyFileState = .{};

        while (switch (this.walker.next()) {
            .result => |res| res,
            .err => |err| return .initErr(err),
        }) |entry| {
            if (comptime Environment.isWindows) {
                switch (entry.kind) {
                    .directory, .file => {},
                    else => continue,
                }

                var src_path_save = this.src_path.save();
                defer src_path_save.restore();

                this.src_path.append(entry.path);

                var dest_subpath_save = this.dest_subpath.save();
                defer dest_subpath_save.restore();

                this.dest_subpath.append(entry.path);

                switch (entry.kind) {
                    .directory => {
                        if (fun.windows.CreateDirectoryExW(this.src_path.sliceZ(), this.dest_subpath.sliceZ(), null) == 0) {
                            fun.MakePath.makePath(u16, dest_dir, entry.path) catch {};
                        }
                    },
                    .file => {
                        switch (fun.copyFile(this.src_path.sliceZ(), this.dest_subpath.sliceZ())) {
                            .result => {},
                            .err => |first_err| {
                                // Retry after creating the parent directory.
                                // For root-level files (`index.js`,
                                // `package.json`, `LICENSE`) `dirname` is
                                // null and there is no missing parent to
                                // create — `dest_dir` itself was already
                                // opened above — so the original error is the
                                // real failure and must propagate. Silently
                                // continuing here would let a staged
                                // global-store entry be renamed into place
                                // with files missing.
                                const entry_dirname = fun.Dirname.dirname(u16, entry.path) orelse {
                                    return .initErr(first_err);
                                };
                                fun.MakePath.makePath(u16, dest_dir, entry_dirname) catch {};
                                switch (fun.copyFile(this.src_path.sliceZ(), this.dest_subpath.sliceZ())) {
                                    .result => {},
                                    .err => |err| {
                                        return .initErr(err);
                                    },
                                }
                            },
                        }
                    },
                    else => unreachable,
                }
            } else {
                if (entry.kind != .file) {
                    continue;
                }

                const src = switch (entry.dir.openat(entry.basename, fun.O.RDONLY, 0)) {
                    .result => |fd| fd,
                    .err => |err| {
                        return .initErr(err);
                    },
                };
                defer src.close();

                var dest = dest_dir.createFileZ(entry.path, .{}) catch dest: {
                    if (fun.Dirname.dirname(fun.OSPathChar, entry.path)) |entry_dirname| {
                        fun.MakePath.makePath(fun.OSPathChar, dest_dir, entry_dirname) catch {};
                    }

                    break :dest dest_dir.createFileZ(entry.path, .{}) catch |err| {
                        Output.prettyErrorln("<r><red>{s}<r>: copy file {f}", .{ @errorName(err), fun.fmt.fmtOSPath(entry.path, .{}) });
                        Global.exit(1);
                    };
                };
                defer dest.close();

                if (comptime Environment.isPosix) {
                    const stat = src.stat().unwrap() catch continue;
                    _ = fun.c.fchmod(dest.handle, @intCast(stat.mode));
                }

                switch (fun.copyFileWithState(src, .fromStdFile(dest), &copy_file_state)) {
                    .result => {},
                    .err => |err| {
                        return .initErr(err);
                    },
                }
            }
        }

        return .success;
    }
};

const Walker = @import("../../sys/walker_skippable.zig");

const fun = @import("fun");
const Environment = fun.Environment;
const FD = fun.FD;
const Global = fun.Global;
const OOM = fun.OOM;
const Output = fun.Output;
const sys = fun.sys;
