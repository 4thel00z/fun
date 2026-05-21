state: enum { idle, err, done } = .idle,
buf: std.ArrayListUnmanaged(u8) = .{},

pub fn start(this: *@This()) Yield {
    const args = this.bltn().argsSlice();
    var iter = fun.SliceIterator([*:0]const u8).init(args);

    if (args.len == 0) return this.fail(Builtin.Kind.usageString(.dirname));

    while (iter.next()) |item| {
        const arg = fun.sliceTo(item, 0);
        _ = this.print(fun.path.dirname(arg, .posix));
        _ = this.print("\n");
    }

    this.state = .done;
    if (this.bltn().stdout.needsIO()) |safeguard| {
        return this.bltn().stdout.enqueue(this, this.buf.items, safeguard);
    }
    return this.bltn().done(0);
}

pub fn deinit(this: *@This()) void {
    this.buf.deinit(fun.default_allocator);
    //dirname
}

fn fail(this: *@This(), msg: []const u8) Yield {
    if (this.bltn().stderr.needsIO()) |safeguard| {
        this.state = .err;
        return this.bltn().stderr.enqueue(this, msg, safeguard);
    }
    _ = this.bltn().writeNoIO(.stderr, msg);
    return this.bltn().done(1);
}

fn print(this: *@This(), msg: []const u8) Maybe(void) {
    if (this.bltn().stdout.needsIO() != null) {
        fun.handleOom(this.buf.appendSlice(fun.default_allocator, msg));
        return .success;
    }
    const res = this.bltn().writeNoIO(.stdout, msg);
    if (res == .err) return Maybe(void).initErr(res.err);
    return .success;
}

pub fn onIOWriterChunk(this: *@This(), _: usize, maybe_e: ?jsc.SystemError) Yield {
    if (maybe_e) |e| {
        defer e.deref();
        this.state = .err;
        return this.bltn().done(1);
    }
    switch (this.state) {
        .done => return this.bltn().done(0),
        .err => return this.bltn().done(1),
        .idle => fun.shell.unreachableState("Dirname.onIOWriterChunk", "idle"),
    }
}

pub inline fn bltn(this: *@This()) *Builtin {
    const impl: *Builtin.Impl = @alignCast(@fieldParentPtr("dirname", this));
    return @fieldParentPtr("impl", impl);
}

// --

const interpreter = @import("../interpreter.zig");
const std = @import("std");

const Interpreter = interpreter.Interpreter;
const Builtin = Interpreter.Builtin;

const fun = @import("fun");
const jsc = fun.jsc;
const Maybe = fun.sys.Maybe;
const Yield = fun.shell.Yield;
