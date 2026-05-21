pub const Binary = @This();

base: State,
node: *const ast.Binary,
/// Based on precedence rules binary expr can only be child of a stmt or
/// another binary expr
parent: ParentPtr,
left: ?ExitCode = null,
right: ?ExitCode = null,
io: IO,
currently_executing: ?ChildPtr = null,

pub const ChildPtr = StatePtrUnion(.{
    Async,
    Cmd,
    Pipeline,
    Binary,
    Assigns,
    If,
    CondExpr,
    Subshell,
});

pub const ParentPtr = StatePtrUnion(.{
    Stmt,
    Binary,
});

pub fn init(
    interpreter: *Interpreter,
    shell_state: *ShellExecEnv,
    node: *const ast.Binary,
    parent: ParentPtr,
    io: IO,
) *Binary {
    var binary = parent.create(Binary);
    binary.node = node;
    binary.base = State.initWithNewAllocScope(.binary, interpreter, shell_state);
    binary.parent = parent;
    binary.io = io;
    binary.left = null;
    binary.right = null;
    binary.currently_executing = null;
    return binary;
}

pub fn start(this: *Binary) Yield {
    log("binary start {x} ({s})", .{ @intFromPtr(this), @tagName(this.node.op) });
    if (comptime fun.Environment.allow_assert) {
        assert(this.left == null);
        assert(this.right == null);
        assert(this.currently_executing == null);
    }

    this.currently_executing = this.makeChild(true);
    if (this.currently_executing == null) {
        this.currently_executing = this.makeChild(false);
        this.left = 0;
    }
    fun.assert(this.currently_executing != null);
    return this.currently_executing.?.start();
}

fn makeChild(this: *Binary, left: bool) ?ChildPtr {
    const node = if (left) &this.node.left else &this.node.right;
    switch (node.*) {
        .cmd => {
            const cmd = Cmd.init(this.base.interpreter, this.base.shell, node.cmd, Cmd.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(cmd);
        },
        .binary => {
            const binary = Binary.init(this.base.interpreter, this.base.shell, node.binary, Binary.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(binary);
        },
        .pipeline => {
            const pipeline = Pipeline.init(this.base.interpreter, this.base.shell, node.pipeline, Pipeline.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(pipeline);
        },
        .assign => |assigns| {
            const assign = Assigns.init(this.base.interpreter, this.base.shell, assigns, .shell, Assigns.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(assign);
        },
        .subshell => {
            switch (Subshell.initDupeShellState(
                this.base.interpreter,
                this.base.shell,
                node.subshell,
                Subshell.ParentPtr.init(this),
                this.io.copy(),
            )) {
                .result => |subshell| {
                    return ChildPtr.init(subshell);
                },
                .err => |e| {
                    this.base.throw(&fun.shell.ShellErr.newSys(e));
                    return null;
                },
            }
        },
        .@"if" => {
            const if_clause = If.init(this.base.interpreter, this.base.shell, node.@"if", If.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(if_clause);
        },
        .condexpr => {
            const condexpr = CondExpr.init(this.base.interpreter, this.base.shell, node.condexpr, CondExpr.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(condexpr);
        },
        .async => {
            const async = Async.init(this.base.interpreter, this.base.shell, node.async, Async.ParentPtr.init(this), this.io.copy());
            return ChildPtr.init(async);
        },
    }
}

pub fn childDone(this: *Binary, child: ChildPtr, exit_code: ExitCode) Yield {
    if (comptime fun.Environment.allow_assert) {
        assert(this.left == null or this.right == null);
        assert(this.currently_executing != null);
    }
    log("binary child done {x} ({s}) {s}", .{ @intFromPtr(this), @tagName(this.node.op), if (this.left == null) "left" else "right" });

    child.deinit();
    this.currently_executing = null;

    if (this.left == null) {
        this.left = exit_code;
        if ((this.node.op == .And and exit_code != 0) or (this.node.op == .Or and exit_code == 0)) {
            return this.parent.childDone(this, exit_code);
        }

        this.currently_executing = this.makeChild(false);
        if (this.currently_executing == null) {
            this.right = 0;
            return this.parent.childDone(this, 0);
        }

        return this.currently_executing.?.start();
    }

    this.right = exit_code;
    return this.parent.childDone(this, exit_code);
}

pub fn deinit(this: *Binary) void {
    if (this.currently_executing) |child| {
        child.deinit();
    }
    this.io.deinit();
    this.base.endScope();
    this.parent.allocator().destroy(this);
}

const fun = @import("fun");
const assert = fun.assert;

const ExitCode = fun.shell.ExitCode;
const Yield = fun.shell.Yield;
const ast = fun.shell.AST;

const Interpreter = fun.shell.Interpreter;
const Assigns = fun.shell.Interpreter.Assigns;
const Async = fun.shell.Interpreter.Async;
const Cmd = fun.shell.Interpreter.Cmd;
const CondExpr = fun.shell.Interpreter.CondExpr;
const IO = fun.shell.Interpreter.IO;
const If = fun.shell.Interpreter.If;
const Pipeline = fun.shell.Interpreter.Pipeline;
const ShellExecEnv = Interpreter.ShellExecEnv;
const State = fun.shell.Interpreter.State;
const Stmt = fun.shell.Interpreter.Stmt;
const Subshell = fun.shell.Interpreter.Subshell;

const StatePtrUnion = fun.shell.interpret.StatePtrUnion;
const log = fun.shell.interpret.log;
