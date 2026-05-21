test {
    _ = @import("./shell_parser/braces.zig");
    _ = @import("./runtime/node/assert/myers_diff.zig");
}

test "basic string usage" {
    var s = fun.String.cloneUTF8("hi");
    defer s.deref();
    try t.expect(s.tag != .Dead and s.tag != .Empty);
    try t.expectEqual(s.length(), 2);
    try t.expectEqualStrings(s.asUTF8().?, "hi");
}

const fun = @import("fun");

const std = @import("std");
const t = std.testing;
