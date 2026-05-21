pub fn create(globalThis: *jsc.JSGlobalObject) jsc.JSValue {
    const object = JSValue.createEmptyObject(globalThis, 1);
    object.put(
        globalThis,
        ZigString.static("parse"),
        jsc.JSFunction.create(
            globalThis,
            "parse",
            parse,
            1,
            .{},
        ),
    );

    return object;
}

pub fn parse(
    globalThis: *jsc.JSGlobalObject,
    callframe: *jsc.CallFrame,
) fun.JSError!jsc.JSValue {
    var arena = fun.ArenaAllocator.init(globalThis.allocator());
    const allocator = arena.allocator();
    defer arena.deinit();

    var ast_memory_allocator = fun.handleOom(allocator.create(ast.ASTMemoryAllocator));
    var ast_scope = ast_memory_allocator.enter(allocator);
    defer ast_scope.exit();

    var log = logger.Log.init(default_allocator);
    defer log.deinit();
    const input_value = callframe.argument(0);
    if (input_value.isEmptyOrUndefinedOrNull()) {
        return globalThis.throwInvalidArguments("Expected a string to parse", .{});
    }

    var input_slice = try input_value.toSlice(globalThis, fun.default_allocator);
    defer input_slice.deinit();
    const source = &logger.Source.initPathString("input.toml", input_slice.slice());
    const parse_result = TOML.parse(source, &log, allocator, false) catch |err| {
        if (err == error.StackOverflow) {
            return globalThis.throwStackOverflow();
        }
        return globalThis.throwValue(try log.toJS(globalThis, default_allocator, "Failed to parse toml"));
    };

    // for now...
    const buffer_writer = js_printer.BufferWriter.init(allocator);
    var writer = js_printer.BufferPrinter.init(buffer_writer);
    _ = js_printer.printJSON(
        *js_printer.BufferPrinter,
        &writer,
        parse_result,
        source,
        .{
            .mangled_props = null,
        },
    ) catch {
        return globalThis.throwValue(try log.toJS(globalThis, default_allocator, "Failed to print toml"));
    };

    const slice = writer.ctx.buffer.slice();
    var out = fun.String.borrowUTF8(slice);
    defer out.deref();

    return out.toJSByParseJSON(globalThis);
}

const fun = @import("fun");
const ast = fun.ast;
const default_allocator = fun.default_allocator;
const js_printer = fun.js_printer;
const logger = fun.logger;
const TOML = fun.interchange.toml.TOML;

const jsc = fun.jsc;
const JSGlobalObject = jsc.JSGlobalObject;
const JSValue = jsc.JSValue;
const ZigString = jsc.ZigString;
