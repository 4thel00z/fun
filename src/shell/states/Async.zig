pub const Async = @This();

base: State,
node: *const ast.Expr,
parent: ParentPtr,
io: IO,
state: union(enum) {
    idle,
    exec: struct {
        child: ?ChildPtr = null,
    },
    done: ExitCode,
} = .idle,
event_loop: jsc.EventLoopHandle,
concurrent_task: jsc.EventLoopTask,

pub const ParentPtr = StatePtrUnion(.{
    Binary,
    Stmt,
});

pub const ChildPtr = StatePtrUnion(.{
    Pipeline,
    Cmd,
    If,
    CondExpr,
});

pub fn format(this: *const Async, writer: *std.Io.Writer) !void {
    try writer.print("Async(0x{x}, child={s})", .{ @intFromPtr(this), @tagName(this.node.*) });
}

pub fn init(
    interpreter: *Interpreter,
    shell_state: *ShellExecEnv,
    node: *const ast.Expr,
    parent: ParentPtr,
    io: IO,
) *Async {
    interpreter.async_commands_executing += 1;
    const async_cmd = parent.create(Async);
    async_cmd.* = .{
        .base = State.initWithNewAllocScope(.async, interpreter, shell_state),
        .node = node,
        .parent = parent,
        .io = io,
        .event_loop = interpreter.event_loop,
        .concurrent_task = jsc.EventLoopTask.fromEventLoop(interpreter.event_loop),
    };
    return async_cmd;
}

pub fn start(this: *Async) Yield {
    log("{f} start", .{this});
    this.enqueueSelf();
    return this.parent.childDone(this, 0);
}

pub fn next(this: *Async) Yield {
    log("{f} next {s}", .{ this, @tagName(this.state) });
    switch (this.state) {
        .idle => {
            this.state = .{ .exec = .{} };
            this.enqueueSelf();
            return .suspended;
        },
        .exec => {
            if (this.state.exec.child) |child| {
                return child.start();
            }

            const child = brk: {
                switch (this.node.*) {
                    .pipeline => break :brk ChildPtr.init(Pipeline.init(
                        this.base.interpreter,
                        this.base.shell,
                        this.node.pipeline,
                        Pipeline.ParentPtr.init(this),
                        this.io.copy(),
                    )),
                    .cmd => break :brk ChildPtr.init(Cmd.init(
                        this.base.interpreter,
                        this.base.shell,
                        this.node.cmd,
                        Cmd.ParentPtr.init(this),
                        this.io.copy(),
                    )),
                    .@"if" => break :brk ChildPtr.init(If.init(
                        this.base.interpreter,
                        this.base.shell,
                        this.node.@"if",
                        If.ParentPtr.init(this),
                        this.io.copy(),
                    )),
                    .condexpr => break :brk ChildPtr.init(CondExpr.init(
                        this.base.interpreter,
                        this.base.shell,
                        this.node.condexpr,
                        CondExpr.ParentPtr.init(this),
                        this.io.copy(),
                    )),
                    else => {
                        @panic("Encountered an unexpected child of an async command, this indicates a bug in Fun. Please open a GitHub issue.");
                    },
                }
            };
            this.state.exec.child = child;
            this.enqueueSelf();
            return .suspended;
        },
        .done => {
            this.base.interpreter.asyncCmdDone(this);
            return .done;
        },
    }
}

pub fn enqueueSelf(this: *Async) void {
    if (this.event_loop == .js) {
        this.event_loop.js.enqueueTaskConcurrent(this.concurrent_task.js.from(this, .manual_deinit));
    } else {
        this.event_loop.mini.enqueueTaskConcurrent(this.concurrent_task.mini.from(this, "runFromMainThreadMini"));
    }
}

pub fn childDone(this: *Async, child_ptr: ChildPtr, exit_code: ExitCode) Yield {
    log("{f} childDone", .{this});
    child_ptr.deinit();
    this.state = .{ .done = exit_code };
    this.enqueueSelf();
    return .suspended;
}

/// This function is purposefully empty as a hack to ensure Async runs in the background while appearing to
/// the parent that it is done immediately.
///
/// For example, in a script like `sleep 1 & echo hello`, the `sleep 1` part needs to appear as done immediately so the parent doesn't wait for
/// it and instead immediately moves to executing the next command.
///
/// Actual deinitialization is executed once this Async calls `this.base.interpreter.asyncCmdDone(this)`, where the interpreter will call `.actuallyDeinit()`
pub fn deinit(this: *Async) void {
    _ = this;
}

pub fn actuallyDeinit(this: *Async) void {
    this.io.deref();
    this.base.endScope();
    this.parent.destroy(this);
}

pub fn runFromMainThread(this: *Async) void {
    this.next().run();
}

pub fn runFromMainThreadMini(this: *Async, _: *void) void {
    this.runFromMainThread();
}

const std = @import("std");

const fun = @import("fun");
const jsc = fun.jsc;

const shell = fun.shell;
const ExitCode = fun.shell.ExitCode;
const Yield = fun.shell.Yield;
const ast = fun.shell.AST;

const Interpreter = fun.shell.Interpreter;
const Binary = fun.shell.Interpreter.Binary;
const Cmd = fun.shell.Interpreter.Cmd;
const CondExpr = fun.shell.Interpreter.CondExpr;
const IO = fun.shell.Interpreter.IO;
const If = fun.shell.Interpreter.If;
const Pipeline = fun.shell.Interpreter.Pipeline;
const ShellExecEnv = Interpreter.ShellExecEnv;
const State = fun.shell.Interpreter.State;
const Stmt = fun.shell.Interpreter.Stmt;

const StatePtrUnion = fun.shell.interpret.StatePtrUnion;
const log = fun.shell.interpret.log;
