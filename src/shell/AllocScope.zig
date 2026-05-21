//! This is just a wrapper around `fun.AllocationScope` that ensures that it is
//! zero-cost in release builds.

const AllocScope = @This();

__scope: if (fun.Environment.enableAllocScopes) fun.AllocationScope else void,

pub fn beginScope(alloc: std.mem.Allocator) AllocScope {
    if (comptime fun.Environment.enableAllocScopes) {
        return .{ .__scope = fun.AllocationScope.init(alloc) };
    }
    return .{ .__scope = {} };
}

pub fn endScope(this: *AllocScope) void {
    if (comptime fun.Environment.enableAllocScopes) {
        this.__scope.deinit();
    }
}

pub fn leakSlice(this: *AllocScope, memory: anytype) void {
    if (comptime fun.Environment.enableAllocScopes) {
        _ = @typeInfo(@TypeOf(memory)).pointer;
        this.__scope.trackExternalFree(memory, null) catch |err|
            std.debug.panic("invalid free: {}", .{err});
    }
}

pub fn assertInScope(this: *AllocScope, memory: anytype) void {
    if (comptime fun.Environment.enableAllocScopes) {
        this.__scope.assertOwned(memory);
    }
}

pub inline fn allocator(this: *AllocScope) std.mem.Allocator {
    if (comptime fun.Environment.enableAllocScopes) {
        return this.__scope.allocator();
    }
    return fun.default_allocator;
}

const fun = @import("fun");
const std = @import("std");
