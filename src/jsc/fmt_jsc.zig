//! Bindgen target for `fmt_jsc.bind.ts`. The actual formatters live in
//! `src/fun_core/fmt.zig`; only the JS-facing wrapper that takes a
//! `*JSGlobalObject` lives here so `fun_core/` stays JSC-free.

pub const js_bindings = struct {
    const gen = fun.gen.fmt_jsc;

    /// Internal function for testing in highlighter.test.ts
    pub fn fmtString(global: *fun.jsc.JSGlobalObject, code: []const u8, formatter_id: gen.Formatter) fun.JSError!fun.String {
        var buffer = fun.MutableString.initEmpty(fun.default_allocator);
        defer buffer.deinit();
        var writer = buffer.bufferedWriter();

        switch (formatter_id) {
            .highlight_javascript => {
                const formatter = fun.fmt.fmtJavaScript(code, .{
                    .enable_colors = true,
                    .check_for_unhighlighted_write = false,
                });
                writer.writer().print("{f}", .{formatter}) catch |err| {
                    return global.throwError(err, "while formatting");
                };
            },
            .escape_powershell => {
                writer.writer().print("{f}", .{fun.fmt.escapePowershell(code)}) catch |err| {
                    return global.throwError(err, "while formatting");
                };
            },
        }

        writer.flush() catch |err| {
            return global.throwError(err, "while formatting");
        };

        return fun.String.cloneUTF8(buffer.list.items);
    }
};

const fun = @import("fun");
