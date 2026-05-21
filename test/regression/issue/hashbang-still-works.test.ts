import { describe, expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";
import path from "path";

describe.concurrent("hashbang-still-works", () => {
  test("hashbang still works after bounds check fix", async () => {
    const dir = tempDirWithFiles("hashbang", {
      "script.js": "#!/usr/bin/env fun\nconsole.log('hello');",
    });

    await using proc = Fun.spawn({
      cmd: [funExe(), "--fun", "script.js"],
      env: funEnv,
      cwd: dir,
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("hello");
  });

  test("lexer handles single # character without bounds error", async () => {
    const dir = tempDirWithFiles("single-hash", {
      "single-hash.js": "#",
    });

    // Using Fun.build to exercise the lexer directly
    try {
      await Fun.build({
        entrypoints: [path.join(dir, "single-hash.js")],
        target: "node",
      });
      expect.unreachable();
    } catch (e: any) {
      const errorMessage = Fun.inspect((e as AggregateError).errors[0]);
      expect(errorMessage).toContain("error: Syntax Error");
    }
  });

  test("lexer should not crash on single # character", async () => {
    const dir = tempDirWithFiles("single-hash", {
      "single-hash.js": "#",
    });

    await using proc = Fun.spawn({
      cmd: [funExe(), "single-hash.js"],
      env: funEnv,
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    const output = stdout + stderr;
    expect(output).toContain("error: Syntax Error");
    expect(exitCode).toBe(1);
  });
});
