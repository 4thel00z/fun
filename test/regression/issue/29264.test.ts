import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// https://github.com/underdoc-org/fun/issues/29264
test("#29264 bundler survives external + missing imports in same file", { timeout: 30_000 }, async () => {
  using dir = tempDir("issue-29264", {
    "build-fixture.js": /* js */ `
      try {
        await Fun.build({
          entrypoints: ["index.js"],
          plugins: [
            {
              name: "mark-bare-external",
              setup(build) {
                build.onResolve({ filter: /^[^.]/ }, () => ({ external: true }));
              },
            },
          ],
        });
        console.log("DONE:ok");
      } catch (e) {
        console.log("DONE:caught");
        if (e && e.errors) {
          for (const err of e.errors) console.log("ERR:" + err.message);
        }
      }
    `,
    "index.js": /* js */ `
      import "src";
      import "./src";
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "build-fixture.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Before the fix, the child crashed in Fun.build — segfault (release) or
  // index-out-of-bounds panic (debug/ASAN) — so "DONE:caught" never printed.
  // We deliberately don't assert on the bare "src" import; whether the
  // plugin's `{ external: true }` (with no `path`) falls through to a
  // resolver error is plugin semantics, not what this test guards against.
  const combined = stdout + stderr;
  expect(combined).toContain("DONE:caught");
  expect(combined).toContain('Could not resolve: "./src"');
  expect(exitCode).toBe(0);
});
