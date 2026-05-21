//! https://www.gnu.org/software/bash/manual/bash.html#Bash-Conditional-Expressions
//!
pub const CondExpr = @This();

base: State,
node: *const ast.CondExpr,
parent: ParentPtr,
io: IO,
state: union(enum) {
    idle,
    expanding_args: struct {
        idx: u32 = 0,
        expansion: Expansion,
        last_exit_code: ExitCode = 0,
    },
    waiting_stat,
    stat_complete: struct {
        stat: Maybe(fun.Stat),
    },
    waiting_write_err,
    done,
} = .idle,
args: std.array_list.Managed([:0]const u8),

pub const ShellCondExprStatTask = struct {
    task: ShellTask(@This(), runFromThreadPool, runFromMainThread, log),
    condexpr: *CondExpr,
    result: ?Maybe(fun.Stat) = null,
    path: [:0]const u8,
    cwdfd: fun.FD,

    pub fn runFromThreadPool(this: *ShellCondExprStatTask) void {
        this.result = ShellSyscall.statat(this.cwdfd, this.path);
    }

    pub fn runFromMainThread(this: *ShellCondExprStatTask) void {
        defer this.deinit();
        const ret = this.result.?;
        this.result = null;
        this.condexpr.onStatTaskComplete(ret);
    }

    pub fn runFromMainThreadMini(this: *@This(), _: *void) void {
        this.runFromMainThread();
    }

    pub fn deinit(this: *ShellCondExprStatTask) void {
        fun.destroy(this);
    }
};

pub const ParentPtr = StatePtrUnion(.{
    Stmt,
    Binary,
    Pipeline,
    Async,
});

pub const ChildPtr = StatePtrUnion(.{
    Expansion,
});

pub fn init(
    interpreter: *Interpreter,
    shell_state: *ShellExecEnv,
    node: *const ast.CondExpr,
    parent: ParentPtr,
    io: IO,
) *CondExpr {
    const condexpr = parent.create(CondExpr);
    condexpr.* = .{
        .base = State.initWithNewAllocScope(.condexpr, interpreter, shell_state),
        .node = node,
        .parent = parent,
        .io = io,
        .args = undefined,
    };
    condexpr.args = std.array_list.Managed([:0]const u8).init(condexpr.base.allocator());
    return condexpr;
}

pub fn format(this: *const CondExpr, writer: *std.Io.Writer) !void {
    try writer.print("CondExpr(0x{x}, op={s})", .{ @intFromPtr(this), @tagName(this.node.op) });
}

pub fn start(this: *CondExpr) Yield {
    log("{f} start", .{this});
    return .{ .cond_expr = this };
}

pub fn next(this: *CondExpr) Yield {
    while (this.state != .done) {
        switch (this.state) {
            .idle => {
                this.state = .{ .expanding_args = .{ .expansion = undefined } };
                continue;
            },
            .expanding_args => {
                if (this.state.expanding_args.idx >= this.node.args.len()) {
                    return this.commandImplStart();
                }

                fun.handleOom(this.args.ensureUnusedCapacity(1));
                Expansion.init(
                    this.base.interpreter,
                    this.base.shell,
                    &this.state.expanding_args.expansion,
                    this.node.args.getConst(this.state.expanding_args.idx),
                    Expansion.ParentPtr.init(this),
                    .{
                        .array_of_slice = &this.args,
                    },
                    this.io.copy(),
                );
                this.state.expanding_args.idx += 1;
                return this.state.expanding_args.expansion.start();
            },
            .waiting_stat => return .suspended,
            .stat_complete => {
                switch (this.node.op) {
                    .@"-f" => {
                        const st: fun.Stat = switch (this.state.stat_complete.stat) {
                            .result => |st| st,
                            .err => {
                                // It seems that bash always gives exit code 1
                                return this.parent.childDone(this, 1);
                            },
                        };
                        return this.parent.childDone(this, if (fun.S.ISREG(@intCast(st.mode))) 0 else 1);
                    },
                    .@"-d" => {
                        const st: fun.Stat = switch (this.state.stat_complete.stat) {
                            .result => |st| st,
                            .err => {
                                // It seems that bash always gives exit code 1
                                return this.parent.childDone(this, 1);
                            },
                        };
                        return this.parent.childDone(this, if (fun.S.ISDIR(@intCast(st.mode))) 0 else 1);
                    },
                    .@"-c" => {
                        const st: fun.Stat = switch (this.state.stat_complete.stat) {
                            .result => |st| st,
                            .err => {
                                // It seems that bash always gives exit code 1
                                return this.parent.childDone(this, 1);
                            },
                        };
                        return this.parent.childDone(this, if (fun.S.ISCHR(@intCast(st.mode))) 0 else 1);
                    },
                    .@"-z", .@"-n", .@"==", .@"!=" => @panic("This conditional expression op does not need `stat()`. This indicates a bug in Fun. Please file a GitHub issue."),
                    else => {
                        if (fun.Environment.allow_assert) {
                            inline for (ast.CondExpr.Op.SUPPORTED) |supported| {
                                if (supported == this.node.op) {
                                    @panic("DEV: You did not support the \"" ++ @tagName(supported) ++ "\" conditional expression operation here.");
                                }
                            }
                        }
                        @panic("Invalid conditional expression op, this indicates a bug in Fun. Please file a GithHub issue.");
                    },
                }
            },
            .waiting_write_err => return .suspended,
            .done => assert(false),
        }
    }

    return this.parent.childDone(this, 0);
}

fn commandImplStart(this: *CondExpr) Yield {
    switch (this.node.op) {
        .@"-c",
        .@"-d",
        .@"-f",
        => {
            // Empty string expansion produces no args, or the path is an empty string;
            // the path doesn't exist. On Windows, stat("") can succeed and return the
            // cwd's stat, so we must check for empty paths explicitly.
            if (this.args.items.len == 0 or this.args.items[0].len == 0) return this.parent.childDone(this, 1);
            this.state = .waiting_stat;
            return this.doStat();
        },
        .@"-z" => return this.parent.childDone(this, if (this.args.items.len == 0 or this.args.items[0].len == 0) 0 else 1),
        .@"-n" => return this.parent.childDone(this, if (this.args.items.len > 0 and this.args.items[0].len != 0) 0 else 1),
        .@"==" => {
            const is_eq = this.args.items.len == 0 or (this.args.items.len >= 2 and fun.strings.eql(this.args.items[0], this.args.items[1]));
            return this.parent.childDone(this, if (is_eq) 0 else 1);
        },
        .@"!=" => {
            const is_neq = this.args.items.len >= 2 and !fun.strings.eql(this.args.items[0], this.args.items[1]);
            return this.parent.childDone(this, if (is_neq) 0 else 1);
        },
        // else => @panic("Invalid node op: " ++ @tagName(this.node.op) ++ ", this indicates a bug in Fun. Please file a GithHub issue."),
        else => {
            if (fun.Environment.allow_assert) {
                inline for (ast.CondExpr.Op.SUPPORTED) |supported| {
                    if (supported == this.node.op) {
                        @panic("DEV: You did not support the \"" ++ @tagName(supported) ++ "\" conditional expression operation here.");
                    }
                }
            }

            @panic("Invalid cond expression op, this indicates a bug in Fun. Please file a GithHub issue.");
        },
    }
}

fn doStat(this: *CondExpr) Yield {
    const stat_task = fun.new(ShellCondExprStatTask, .{
        .task = .{
            .event_loop = this.base.eventLoop(),
            .concurrent_task = jsc.EventLoopTask.fromEventLoop(this.base.eventLoop()),
        },
        .condexpr = this,
        .path = this.args.items[0],
        .cwdfd = this.base.shell.cwd_fd,
    });
    stat_task.task.schedule();
    return .suspended;
}

pub fn deinit(this: *CondExpr) void {
    this.io.deinit();
    for (this.args.items) |item| {
        this.base.allocator().free(item);
    }
    this.args.deinit();
    this.base.endScope();
    this.parent.destroy(this);
}

pub fn childDone(this: *CondExpr, child: ChildPtr, exit_code: ExitCode) Yield {
    if (child.ptr.is(Expansion)) {
        if (exit_code != 0) {
            const err = this.state.expanding_args.expansion.state.err;
            defer err.deinit(fun.default_allocator);
            this.state.expanding_args.expansion.deinit();
            return this.writeFailingError("{f}\n", .{err});
        }
        child.deinit();
        return this.next();
    }

    @panic("Invalid child to cond expression, this indicates a bug in Fun. Please file a report on Github.");
}

pub fn onStatTaskComplete(this: *CondExpr, result: Maybe(fun.Stat)) void {
    if (fun.Environment.allow_assert) assert(this.state == .waiting_stat);

    this.state = .{
        .stat_complete = .{ .stat = result },
    };
    this.next().run();
}

pub fn writeFailingError(this: *CondExpr, comptime fmt: []const u8, args: anytype) Yield {
    const handler = struct {
        fn enqueueCb(ctx: *CondExpr) void {
            ctx.state = .waiting_write_err;
        }
    };
    return this.base.shell.writeFailingErrorFmt(this, handler.enqueueCb, fmt, args);
}

pub fn onIOWriterChunk(this: *CondExpr, _: usize, err: ?jsc.SystemError) Yield {
    if (err != null) {
        defer err.?.deref();
        const exit_code: ExitCode = @intFromEnum(err.?.getErrno());
        return this.parent.childDone(this, exit_code);
    }

    if (this.state == .waiting_write_err) {
        return this.parent.childDone(this, 1);
    }

    fun.shell.unreachableState("CondExpr.onIOWriterChunk", @tagName(this.state));
}

const std = @import("std");

const fun = @import("fun");
const assert = fun.assert;
const jsc = fun.jsc;
const Maybe = fun.sys.Maybe;

const shell = fun.shell;
const ExitCode = fun.shell.ExitCode;
const Yield = fun.shell.Yield;
const ast = fun.shell.AST;

const Interpreter = fun.shell.Interpreter;
const Async = fun.shell.Interpreter.Async;
const Binary = fun.shell.Interpreter.Binary;
const Expansion = fun.shell.Interpreter.Expansion;
const IO = fun.shell.Interpreter.IO;
const Pipeline = fun.shell.Interpreter.Pipeline;
const ShellExecEnv = Interpreter.ShellExecEnv;
const State = fun.shell.Interpreter.State;
const Stmt = fun.shell.Interpreter.Stmt;

const ShellSyscall = fun.shell.interpret.ShellSyscall;
const ShellTask = fun.shell.interpret.ShellTask;
const StatePtrUnion = fun.shell.interpret.StatePtrUnion;
const log = fun.shell.interpret.log;
