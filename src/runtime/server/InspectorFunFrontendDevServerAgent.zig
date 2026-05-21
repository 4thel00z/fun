const InspectorFunFrontendDevServerAgentHandle = opaque {
    const c = struct {
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyClientConnected(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, connectionId: i32) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyClientDisconnected(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, connectionId: i32) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyBundleStart(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, triggerFiles: [*]fun.String, triggerFilesLen: usize) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyBundleComplete(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, durationMs: f64) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyBundleFailed(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, buildErrorsPayloadBase64: *fun.String) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyClientNavigated(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, connectionId: i32, url: *fun.String, routeBundleId: i32) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyClientErrorReported(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, clientErrorPayloadBase64: *fun.String) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyGraphUpdate(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, visualizerPayloadBase64: *fun.String) void;
        extern "c" fn InspectorFunFrontendDevServerAgent__notifyConsoleLog(agent: *InspectorFunFrontendDevServerAgentHandle, devServerId: i32, kind: u8, data: *fun.String) void;
    };
    const notifyClientConnected = c.InspectorFunFrontendDevServerAgent__notifyClientConnected;
    const notifyClientDisconnected = c.InspectorFunFrontendDevServerAgent__notifyClientDisconnected;
    const notifyBundleStart = c.InspectorFunFrontendDevServerAgent__notifyBundleStart;
    const notifyBundleComplete = c.InspectorFunFrontendDevServerAgent__notifyBundleComplete;
    const notifyBundleFailed = c.InspectorFunFrontendDevServerAgent__notifyBundleFailed;
    const notifyClientNavigated = c.InspectorFunFrontendDevServerAgent__notifyClientNavigated;
    const notifyClientErrorReported = c.InspectorFunFrontendDevServerAgent__notifyClientErrorReported;
    const notifyGraphUpdate = c.InspectorFunFrontendDevServerAgent__notifyGraphUpdate;
    const notifyConsoleLog = c.InspectorFunFrontendDevServerAgent__notifyConsoleLog;
};

pub const BunFrontendDevServerAgent = struct {
    next_inspector_connection_id: i32 = 0,
    handle: ?*InspectorFunFrontendDevServerAgentHandle = null,

    pub fn nextConnectionID(this: *BunFrontendDevServerAgent) i32 {
        const id = this.next_inspector_connection_id;
        this.next_inspector_connection_id +%= 1;
        return id;
    }

    pub fn isEnabled(this: *const BunFrontendDevServerAgent) bool {
        return this.handle != null;
    }

    pub fn notifyClientConnected(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, connectionId: i32) void {
        if (this.handle) |handle| {
            handle.notifyClientConnected(devServerId.get(), connectionId);
        }
    }

    pub fn notifyClientDisconnected(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, connectionId: i32) void {
        if (this.handle) |handle| {
            handle.notifyClientDisconnected(devServerId.get(), connectionId);
        }
    }

    pub fn notifyBundleStart(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, triggerFiles: []fun.String) void {
        if (this.handle) |handle| {
            handle.notifyBundleStart(devServerId.get(), triggerFiles.ptr, triggerFiles.len);
        }
    }

    pub fn notifyBundleComplete(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, durationMs: f64) void {
        if (this.handle) |handle| {
            handle.notifyBundleComplete(devServerId.get(), durationMs);
        }
    }

    pub fn notifyBundleFailed(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, buildErrorsPayloadBase64: *fun.String) void {
        if (this.handle) |handle| {
            handle.notifyBundleFailed(devServerId.get(), buildErrorsPayloadBase64);
        }
    }

    pub fn notifyClientNavigated(
        this: *const BunFrontendDevServerAgent,
        devServerId: DebuggerId,
        connectionId: i32,
        url: *fun.String,
        routeBundleId: ?DevServer.RouteBundle.Index,
    ) void {
        if (this.handle) |handle| {
            handle.notifyClientNavigated(
                devServerId.get(),
                connectionId,
                url,
                if (routeBundleId) |id| id.get() else -1,
            );
        }
    }

    pub fn notifyClientErrorReported(
        this: *const BunFrontendDevServerAgent,
        devServerId: DebuggerId,
        clientErrorPayloadBase64: *fun.String,
    ) void {
        if (this.handle) |handle| {
            handle.notifyClientErrorReported(devServerId.get(), clientErrorPayloadBase64);
        }
    }

    pub fn notifyGraphUpdate(this: *const BunFrontendDevServerAgent, devServerId: DebuggerId, visualizerPayloadBase64: *fun.String) void {
        if (this.handle) |handle| {
            handle.notifyGraphUpdate(devServerId.get(), visualizerPayloadBase64);
        }
    }

    pub fn notifyConsoleLog(this: BunFrontendDevServerAgent, devServerId: DebuggerId, kind: fun.bake.DevServer.ConsoleLogKind, data: *fun.String) void {
        if (this.handle) |handle| {
            handle.notifyConsoleLog(devServerId.get(), @intFromEnum(kind), data);
        }
    }

    export fn Fun__InspectorFunFrontendDevServerAgent__setEnabled(agent: ?*InspectorFunFrontendDevServerAgentHandle) void {
        if (jsc.VirtualMachine.get().debugger) |*debugger| {
            debugger.frontend_dev_server_agent.handle = agent;
        }
    }
};

const fun = @import("fun");
const jsc = fun.jsc;
const DevServer = fun.bake.DevServer;
const DebuggerId = jsc.Debugger.DebuggerId;
