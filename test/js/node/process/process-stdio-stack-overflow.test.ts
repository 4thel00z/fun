import { spawnSync } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import path from "path";

test.each(["stdin", "stdout", "stderr", "openStdin"])(
  "process.%s lazy init near stack limit does not assert",
  which => {
    const { stderr, signalCode } = spawnSync({
      cmd: [funExe(), path.join(import.meta.dir, "process-stdio-stack-overflow-fixture.js"), which],
      env: funEnv,
      stdout: "ignore",
      stderr: "pipe",
      stdin: "pipe",
    });
    expect({ signalCode, stderr: stderr.toString() }).toEqual({ signalCode: undefined, stderr: expect.any(String) });
  },
);
