import { expect, test } from "fun:test";
import { funEnv, funExe, isASAN, isDebug } from "harness";
import { join } from "node:path";

// The bug is a heap-use-after-free that only surfaces reliably under ASAN:
// RequestContext held a raw *Response and dereferenced it in onAbort after
// the (unprotected) Response had been GC'd during backpressure. On release
// builds the freed slot is usually still readable so the deref happens to
// succeed. `fun bd` debug builds enable ASAN by default but are named
// `fun-debug`, not `fun-asan`.
test.skipIf(!isASAN && !isDebug)(
  "onAbort does not dereference a freed Response after GC during tryEnd() backpressure",
  async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), join(import.meta.dir, "serve-response-gc-backpressure-abort-fixture.ts")],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(stderr).toBe("");
    const result = JSON.parse(stdout.trim());
    expect(result).toEqual({
      pending: 0,
      abortCount: result.iterations,
      iterations: result.iterations,
    });
    expect(exitCode).toBe(0);
  },
  60_000,
);
