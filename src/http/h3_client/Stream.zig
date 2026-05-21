//! One in-flight HTTP/3 request. Created when the request is enqueued on a
//! `ClientSession`; the lsquic stream is bound later from
//! `callbacks.onStreamOpen` (lsquic creates streams asynchronously once
//! MAX_STREAMS credit is available). Owned by the session's `pending` list
//! until `ClientSession.detach`.

const Stream = @This();

pub const new = fun.TrivialNew(@This());

session: *ClientSession,
client: ?*HTTPClient,
qstream: ?*quic.Stream = null,

/// Slices into the lsquic-owned hset buffer; valid only for the duration
/// of the `onStreamHeaders` callback that populated it. `cloneMetadata`
/// deep-copies synchronously inside that callback, so nothing reads these
/// after they go stale.
decoded_headers: std.ArrayListUnmanaged(picohttp.Header) = .{},
body_buffer: std.ArrayListUnmanaged(u8) = .{},
status_code: u16 = 0,

pending_body: []const u8 = "",
request_body_done: bool = false,
is_streaming_body: bool = false,
headers_delivered: bool = false,

pub fn deinit(this: *Stream) void {
    this.decoded_headers.deinit(fun.default_allocator);
    this.body_buffer.deinit(fun.default_allocator);
    _ = H3.live_streams.fetchSub(1, .monotonic);
    fun.destroy(this);
}

pub fn abort(this: *Stream) void {
    if (this.qstream) |qs| qs.close();
}

const ClientSession = @import("./ClientSession.zig");
const H3 = @import("../H3Client.zig");
const std = @import("std");

const fun = @import("fun");
const HTTPClient = fun.http;
const picohttp = fun.picohttp;
const quic = fun.uws.quic;
