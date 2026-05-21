// maybe rename to `PackageJSONCache` if we cache more than workspaces

pub const MapEntry = struct {
    root: Expr,
    source: logger.Source,
    indentation: JSPrinter.Options.Indentation = .{},
};

pub const Map = fun.StringHashMapUnmanaged(MapEntry);

pub const GetJSONOptions = struct {
    init_reset_store: bool = true,
    guess_indentation: bool = false,
};

pub const GetResult = union(enum) {
    entry: *MapEntry,
    read_err: anyerror,
    parse_err: anyerror,

    pub fn unwrap(this: GetResult) !*MapEntry {
        return switch (this) {
            .entry => |entry| entry,
            inline else => |err| err,
        };
    }
};

map: Map = .{},

/// Given an absolute path to a workspace package.json, return the AST
/// and contents of the file. If the package.json is not present in the
/// cache, it will be read from disk and parsed, and stored in the cache.
pub fn getWithPath(
    this: *@This(),
    allocator: std.mem.Allocator,
    log: *logger.Log,
    abs_package_json_path: anytype,
    comptime opts: GetJSONOptions,
) GetResult {
    fun.assertWithLocation(std.fs.path.isAbsolute(abs_package_json_path), @src());

    var buf: if (Environment.isWindows) fun.PathBuffer else void = undefined;
    const path = if (comptime !Environment.isWindows)
        abs_package_json_path
    else brk: {
        @memcpy(buf[0..abs_package_json_path.len], abs_package_json_path);
        fun.path.dangerouslyConvertPathToPosixInPlace(u8, buf[0..abs_package_json_path.len]);
        break :brk buf[0..abs_package_json_path.len];
    };

    const entry = fun.handleOom(this.map.getOrPut(allocator, path));
    if (entry.found_existing) {
        return .{ .entry = entry.value_ptr };
    }

    const key = fun.handleOom(allocator.dupeZ(u8, path));
    entry.key_ptr.* = key;

    const source = &(fun.sys.File.toSource(key, allocator, .{}).unwrap() catch |err| {
        _ = this.map.remove(key);
        allocator.free(key);
        return .{ .read_err = err };
    });

    if (comptime opts.init_reset_store)
        initializeStore();

    const json = JSON.parsePackageJSONUTF8WithOpts(
        source,
        log,
        allocator,
        .{
            .is_json = true,
            .allow_comments = true,
            .allow_trailing_commas = true,
            .guess_indentation = opts.guess_indentation,
        },
    ) catch |err| {
        _ = this.map.remove(key);
        fun.handleErrorReturnTrace(err, @errorReturnTrace());
        return .{ .parse_err = err };
    };

    entry.value_ptr.* = .{
        .root = fun.handleOom(json.root.deepClone(fun.default_allocator)),
        .source = source.*,
        .indentation = json.indentation,
    };

    return .{ .entry = entry.value_ptr };
}

/// source path is used as the key, needs to be absolute
pub fn getWithSource(
    this: *@This(),
    allocator: std.mem.Allocator,
    log: *logger.Log,
    source: *const logger.Source,
    comptime opts: GetJSONOptions,
) GetResult {
    fun.assertWithLocation(std.fs.path.isAbsolute(source.path.text), @src());

    var buf: if (Environment.isWindows) fun.PathBuffer else void = undefined;
    const path = if (comptime !Environment.isWindows)
        source.path.text
    else brk: {
        @memcpy(buf[0..source.path.text.len], source.path.text);
        fun.path.dangerouslyConvertPathToPosixInPlace(u8, buf[0..source.path.text.len]);
        break :brk buf[0..source.path.text.len];
    };

    const entry = fun.handleOom(this.map.getOrPut(allocator, path));
    if (entry.found_existing) {
        return .{ .entry = entry.value_ptr };
    }

    if (comptime opts.init_reset_store)
        initializeStore();

    const json_result = JSON.parsePackageJSONUTF8WithOpts(
        source,
        log,
        allocator,
        .{
            .is_json = true,
            .allow_comments = true,
            .allow_trailing_commas = true,
            .guess_indentation = opts.guess_indentation,
        },
    );

    const json = json_result catch |err| {
        _ = this.map.remove(path);
        return .{ .parse_err = err };
    };

    entry.value_ptr.* = .{
        .root = fun.handleOom(json.root.deepClone(allocator)),
        .source = source.*,
        .indentation = json.indentation,
    };

    entry.key_ptr.* = fun.handleOom(allocator.dupe(u8, path));

    return .{ .entry = entry.value_ptr };
}

const std = @import("std");

const fun = @import("fun");
const Environment = fun.Environment;
const JSON = fun.json;
const JSPrinter = fun.js_printer;
const default_allocator = fun.default_allocator;
const logger = fun.logger;
const File = fun.sys.File;
const initializeStore = fun.install.initializeStore;

const js_ast = fun.ast;
const Expr = js_ast.Expr;
