const PathToSourceIndexMap = @This();

/// The lifetime of the keys are not owned by this map.
///
/// We assume it's arena allocated.
map: Map = .{},

const Map = fun.StringHashMapUnmanaged(Index.Int);

pub fn getPath(this: *const PathToSourceIndexMap, path: *const Fs.Path) ?Index.Int {
    return this.get(path.text);
}

pub fn get(this: *const PathToSourceIndexMap, text: []const u8) ?Index.Int {
    return this.map.get(text);
}

pub fn putPath(this: *PathToSourceIndexMap, allocator: std.mem.Allocator, path: *const Fs.Path, value: Index.Int) fun.OOM!void {
    try this.map.put(allocator, path.text, value);
}

pub fn put(this: *PathToSourceIndexMap, allocator: std.mem.Allocator, text: []const u8, value: Index.Int) fun.OOM!void {
    try this.map.put(allocator, text, value);
}

pub fn getOrPutPath(this: *PathToSourceIndexMap, allocator: std.mem.Allocator, path: *const Fs.Path) fun.OOM!Map.GetOrPutResult {
    return this.getOrPut(allocator, path.text);
}

pub fn getOrPut(this: *PathToSourceIndexMap, allocator: std.mem.Allocator, text: []const u8) fun.OOM!Map.GetOrPutResult {
    return try this.map.getOrPut(allocator, text);
}

pub fn remove(this: *PathToSourceIndexMap, text: []const u8) bool {
    return this.map.remove(text);
}

pub fn removePath(this: *PathToSourceIndexMap, path: *const Fs.Path) bool {
    return this.remove(path.text);
}

const std = @import("std");

const fun = @import("fun");
const Fs = fun.fs;
const Index = fun.ast.Index;
