pub const OfflineMode = enum {
    online,
    latest,
    offline,
};

pub const Prefer = fun.ComptimeStringMap(OfflineMode, .{
    &.{ "offline", OfflineMode.offline },
    &.{ "latest", OfflineMode.latest },
    &.{ "online", OfflineMode.online },
});

const fun = @import("fun");
