import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows } from "harness";
import path from "path";

// Windows: self-referential symlinks behave differently and the recursive
// walker takes a different open path there; this leak is posix-specific.
test.skipIf(isWindows)(
  "readdirSync({recursive:true, withFileTypes:true}) error path does not leak Dirent.path",
  async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), path.join(import.meta.dir, "readdirSync-recursive-error-leak-fixture.js")],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stderr).toBe("");
    expect(stdout).toContain("RSS delta");
    expect(exitCode).toBe(0);
  },
  90_000,
);
