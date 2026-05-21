import { describe, expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

describe("spawn with empty", () => {
  for (const [stdin, label] of [
    [new ArrayBuffer(0), "ArrayBuffer"],
    [new Uint8Array(0), "Uint8Array"],
    [new Blob([]), "Blob"],
  ] as const) {
    test(label + " for stdin", async () => {
      const proc = Fun.spawn({
        cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
        stdin,
        stdout: "pipe",
        stderr: "pipe",
        env: funEnv,
      });

      const [exited, stdout, stderr] = await Promise.all([proc.exited, proc.stdout.text(), proc.stderr.text()]);
      expect(exited).toBe(0);
      expect(stdout).toBeEmpty();
      expect(stderr).toBeEmpty();
    });
  }
});
