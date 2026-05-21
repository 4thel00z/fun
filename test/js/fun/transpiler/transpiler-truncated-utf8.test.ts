import { describe, expect, test } from "fun:test";
import { funEnv, funExe, isLinux, isMacOS, libcPathForDlopen } from "harness";
import path from "node:path";

// The fixture uses mmap/mprotect via fun:ffi to place source bytes immediately
// before a PROT_NONE guard page, so any read past the end of the input faults
// deterministically. The fixture only knows the mmap flags for Linux (glibc +
// musl) and macOS; libcPathForDlopen() supplies the right shared-object path.
describe.skipIf(!(isLinux || isMacOS))("Fun.Transpiler.transformSync with truncated UTF-8 at end of buffer", () => {
  test("does not read past the end of the input buffer", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), path.join(import.meta.dir, "transpiler-truncated-utf8-fixture.ts")],
      env: { ...funEnv, FUN_TEST_LIBC_PATH: libcPathForDlopen() },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    // On failure the subprocess segfaults before printing DONE and exits
    // with a non-zero code / SIGSEGV signal.
    expect({
      stdout: stdout.trim().split("\n"),
      stderr,
      exitCode,
      signalCode: proc.signalCode,
    }).toEqual({
      stdout: [
        expect.stringContaining("ok: 1@ + 4-byte lead"),
        expect.stringContaining("ok: 1@ + 3-byte lead"),
        expect.stringContaining("ok: 1@ + 2-byte lead"),
        expect.stringContaining("ok: 4-byte lead + 1 continuation"),
        expect.stringContaining("ok: 4-byte lead + 2 continuations"),
        expect.stringContaining("ok: sourceMappingURL pragma + 4-byte lead"),
        "DONE",
      ],
      stderr: "",
      exitCode: 0,
      signalCode: null,
    });
  });
});
