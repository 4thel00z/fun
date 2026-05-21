// Fixture for detecting the memory leak when TLS options (cert/key/ca) are
// passed as Fun.file() blobs. Spawned as a subprocess with --smol for clean
// memory measurement.
//
// Without the fix, SSLConfig.readFromBlob() duplicates the file contents
// returned by readFileWithOptions() and orphans the original buffer, leaking
// one buffer per cert/key per config parse.
//
// Uses Fun.listen (rather than Fun.serve) because it frees its SSLConfig
// synchronously on stop() rather than waiting for GC finalization.
//
// Env: TLS_CERT_PATH, TLS_KEY_PATH - paths to (large) PEM files

const certPath = process.env.TLS_CERT_PATH;
const keyPath = process.env.TLS_KEY_PATH;
const iterations = parseInt(process.env.ITERATIONS || "100", 10);
const warmup = parseInt(process.env.WARMUP || "20", 10);

if (!certPath || !keyPath) {
  throw new Error("TLS_CERT_PATH and TLS_KEY_PATH env vars required");
}

function iterate() {
  const server = Fun.listen({
    port: 0,
    hostname: "127.0.0.1",
    tls: {
      cert: Fun.file(certPath),
      key: Fun.file(keyPath),
    },
    socket: { data() {} },
  });
  server.stop(true);
}

for (let i = 0; i < warmup; i++) iterate();
Fun.gc(true);
const baselineRss = process.memoryUsage.rss();

for (let i = 0; i < iterations; i++) iterate();
Fun.gc(true);
const finalRss = process.memoryUsage.rss();

const growthMB = (finalRss - baselineRss) / (1024 * 1024);

console.log(
  JSON.stringify({
    baselineRss,
    finalRss,
    growthMB: Math.round(growthMB * 100) / 100,
    iterations,
  }),
);
