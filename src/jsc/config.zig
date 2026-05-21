pub const DefaultFunDefines = struct {
    pub const Keys = struct {
        const window = "window";
    };
    pub const Values = struct {
        const window = "undefined";
    };
};

pub fn configureTransformOptionsForFunVM(allocator: std.mem.Allocator, _args: api.TransformOptions) !api.TransformOptions {
    var args = _args;

    args.write = false;
    args.resolve = api.ResolveMode.lazy;
    return try configureTransformOptionsForFun(allocator, args);
}

pub fn configureTransformOptionsForFun(_: std.mem.Allocator, _args: api.TransformOptions) !api.TransformOptions {
    var args = _args;
    args.target = api.Target.fun;
    return args;
}

const fun = @import("fun");
const std = @import("std");
const api = fun.schema.api;
