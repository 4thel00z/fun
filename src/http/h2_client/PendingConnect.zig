//! Placeholder registered while a fresh TLS connect is in flight so that
//! concurrent h2-capable requests to the same origin coalesce onto its
//! eventual session instead of each opening a separate socket.

pub const new = fun.TrivialNew(@This());

hostname: []const u8,
port: u16,
ssl_config: ?*SSLConfig,
waiters: std.ArrayListUnmanaged(*HTTPClient) = .{},

pub fn matches(this: *const @This(), hostname: []const u8, port: u16, ssl_config: ?*SSLConfig) bool {
    return this.port == port and this.ssl_config == ssl_config and strings.eqlLong(this.hostname, hostname, true);
}

pub fn unregisterFrom(this: *@This(), ctx: *NewHTTPContext(true)) void {
    const list = &ctx.pending_h2_connects;
    for (list.items, 0..) |p, i| {
        if (p == this) {
            _ = list.swapRemove(i);
            return;
        }
    }
}

pub fn deinit(this: *@This()) void {
    fun.default_allocator.free(this.hostname);
    this.waiters.deinit(fun.default_allocator);
    fun.destroy(this);
}

const std = @import("std");

const fun = @import("fun");
const strings = fun.strings;
const SSLConfig = fun.api.server.ServerConfig.SSLConfig;

const HTTPClient = fun.http;
const NewHTTPContext = HTTPClient.NewHTTPContext;
