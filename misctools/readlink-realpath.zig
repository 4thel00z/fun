const std = @import("std");

const path_handler = @import("../src/resolver/resolve_path.zig");
const fun = @import("fun");
const string = []const u8;
const Output = fun.Output;
const Global = fun.Global;
const Environment = fun.Environment;
const strings = fun.strings;
const MutableString = fun.MutableString;
const stringZ = [:0]const u8;
const default_allocator = fun.default_allocator;

// zig build-exe -Doptimize=ReleaseFast --main-pkg-path ../ ./readlink-getfd.zig
pub fn main() anyerror!void {
    var stdout_ = std.io.getStdOut();
    var stderr_ = std.io.getStdErr();
    var output_source = Output.Source.init(stdout_, stderr_);
    Output.Source.set(&output_source);
    defer Output.flush();

    var args_buffer: [8192 * 2]u8 = undefined;
    var fixed_buffer = std.heap.FixedBufferAllocator.init(&args_buffer);
    var allocator = fixed_buffer.allocator();

    var args = std.mem.bytesAsSlice([]u8, try std.process.argsAlloc(allocator));

    const to_resolve = args[args.len - 1];
    var out_buffer: fun.PathBuffer = undefined;
    var path: []u8 = undefined;

    var j: usize = 0;
    while (j < 1000) : (j += 1) {
        path = try std.posix.realpathZ(to_resolve, &out_buffer);
    }

    Output.print("{s}", .{path});
}
