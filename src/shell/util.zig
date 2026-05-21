pub const OutKind = enum {
    stdout,
    stderr,

    pub fn toFd(this: OutKind) fun.FD {
        return switch (this) {
            .stdout => .stdout(),
            .stderr => .stderr(),
        };
    }
};

pub const Stdio = fun.spawn.Stdio;

pub const WatchFd = if (Environment.isLinux) posix.fd_t else i32;

const fun = @import("fun");
const Environment = fun.Environment;

const std = @import("std");
const posix = std.posix;
