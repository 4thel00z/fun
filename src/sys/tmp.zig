// O_TMPFILE doesn't seem to work very well.
const allow_tmpfile = false;

// To be used with files
// not folders!
pub const Tmpfile = struct {
    destination_dir: fun.FD = fun.invalid_fd,
    tmpfilename: [:0]const u8 = "",
    fd: fun.FD = fun.invalid_fd,
    using_tmpfile: bool = allow_tmpfile,

    pub fn create(
        destination_dir: fun.FD,
        tmpfilename: [:0]const u8,
    ) fun.sys.Maybe(Tmpfile) {
        const perm = 0o644;
        var tmpfile = Tmpfile{
            .destination_dir = destination_dir,
            .tmpfilename = tmpfilename,
        };

        open: while (true) {
            if (comptime allow_tmpfile) {
                switch (fun.sys.openat(destination_dir, ".", O.WRONLY | O.TMPFILE | O.CLOEXEC, perm)) {
                    .result => |fd| {
                        tmpfile.fd = switch (fun.sys.makeLibUVOwnedFD(fd, .open, .close_on_fail)) {
                            .result => |owned_fd| owned_fd,
                            .err => |err| return .{ .err = err },
                        };
                        break :open;
                    },
                    .err => |err| {
                        switch (err.getErrno()) {
                            .INVAL, .OPNOTSUPP, .NOSYS => {
                                tmpfile.using_tmpfile = false;
                            },
                            else => return .{ .err = err },
                        }
                    },
                }
            }

            tmpfile.fd = switch (fun.sys.openat(destination_dir, tmpfilename, O.CREAT | O.CLOEXEC | O.WRONLY, perm)) {
                .result => |fd| switch (fd.makeLibUVOwnedForSyscall(.open, .close_on_fail)) {
                    .result => |owned_fd| owned_fd,
                    .err => |err| return .{ .err = err },
                },
                .err => |err| return .{ .err = err },
            };
            break :open;
        }

        return .{ .result = tmpfile };
    }

    pub fn finish(this: *Tmpfile, destname: [:0]const u8) !void {
        if (comptime allow_tmpfile) {
            if (this.using_tmpfile) {
                var retry = true;
                const basename: [:0]const u8 = @ptrCast(std.fs.path.basename(destname));
                while (retry) {
                    const ret = fun.sys.linkatTmpfile(this.fd, this.destination_dir, basename);
                    switch (ret) {
                        .result => {
                            return;
                        },
                        .err => |err| {
                            if (err.getErrno() == .EXIST and retry) {
                                _ = fun.sys.unlinkat(this.destination_dir, basename);
                                retry = false;
                                continue;
                            } else {
                                try ret.unwrap();
                                return;
                            }
                        },
                    }
                }
            }
        }

        try fun.sys.moveFileZWithHandle(this.fd, this.destination_dir, this.tmpfilename, this.destination_dir, destname);
    }
};

const std = @import("std");

const fun = @import("fun");
const O = fun.O;
