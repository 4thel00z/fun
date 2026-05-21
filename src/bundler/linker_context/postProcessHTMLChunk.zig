pub fn postProcessHTMLChunk(ctx: GenerateChunkCtx, worker: *ThreadPool.Worker, chunk: *Chunk) !void {
    // This is where we split output into pieces
    const c = ctx.c;
    var j = StringJoiner{
        .allocator = worker.allocator,
        .watcher = .{
            .input = chunk.unique_key,
        },
    };

    const compile_results = chunk.compile_results_for_chunk;

    for (compile_results) |compile_result| {
        j.push(compile_result.code(), fun.default_allocator);
    }

    j.ensureNewlineAtEnd();

    chunk.intermediate_output = c.breakOutputIntoPieces(
        worker.allocator,
        &j,
        @as(u32, @truncate(ctx.chunks.len)),
    ) catch |err| fun.handleOom(err);

    chunk.isolated_hash = c.generateIsolatedHash(chunk);
}

const fun = @import("fun");
const StringJoiner = fun.StringJoiner;

const Chunk = fun.bundle_v2.Chunk;
const ThreadPool = fun.bundle_v2.ThreadPool;

const LinkerContext = fun.bundle_v2.LinkerContext;
const GenerateChunkCtx = fun.bundle_v2.LinkerContext.GenerateChunkCtx;
