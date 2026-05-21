//! C++ export that joins a path against the VM's cwd. Lives in `jsc/` because
//! it reaches into `globalObject.funVM().transpiler.fs`; `paths/` is JSC-free.
//! Referenced from `PathInlines.h`.

export fn ResolvePath__joinAbsStringBufCurrentPlatformFunString(
    globalObject: *fun.jsc.JSGlobalObject,
    in: fun.String,
) fun.String {
    const str = in.toUTF8WithoutRef(fun.default_allocator);
    defer str.deinit();

    const cwd = globalObject.funVM().transpiler.fs.top_level_dir;

    // The input is user-controlled and may be arbitrarily long. The
    // threadlocal `join_buf` is only 4096 bytes, so use a stack-fallback
    // allocator that heap-allocates for oversized inputs.
    var sfa = std.heap.stackFallback(4096, fun.default_allocator);
    const alloc = sfa.get();
    const buf = fun.handleOom(alloc.alloc(u8, cwd.len + str.slice().len + 2));
    defer alloc.free(buf);

    const out_slice = fun.path.joinAbsStringBuf(
        cwd,
        buf,
        &.{str.slice()},
        .auto,
    );

    return fun.String.cloneUTF8(out_slice);
}

const fun = @import("fun");
const std = @import("std");
