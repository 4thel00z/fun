pub const Mode = enum(c_int) {
    normal = 0,
    raw = 1,
    io = 2,
};

pub fn setMode(fd: c_int, mode: Mode) c_int {
    return Fun__ttySetMode(fd, @intFromEnum(mode));
}

extern fn Fun__ttySetMode(fd: c_int, mode: c_int) c_int;
