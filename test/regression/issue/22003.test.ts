import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows, tempDir } from "harness";

// https://github.com/underdoc-org/fun/issues/22003
test.skipIf(isWindows)("tab character in filename should be escaped in sourcemap JSON", async () => {
  using dir = tempDir("22003", {
    // Filename with tab character
    "file\ttab.js": "module.exports = 42;",
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "build", "file\ttab.js", "--outfile=out.js", "--sourcemap"],
    env: funEnv,
    cwd: String(dir),
    stderr: "pipe",
  });

  const [stderr, exitCode] = await Promise.all([proc.stderr.text(), proc.exited]);

  expect(exitCode).toBe(0);
  expect(stderr).not.toContain("InvalidSourceMap");

  const sourcemapContent = await Fun.file(`${dir}/out.js.map`).text();

  // Must be valid JSON (system fun would produce invalid JSON with literal tab)
  let sourcemap;
  expect(() => {
    sourcemap = JSON.parse(sourcemapContent);
  }).not.toThrow();

  // The filename in sources should have the tab properly escaped
  expect(sourcemap.sources).toContain("file\ttab.js");

  // Verify no literal tab bytes (0x09) in the raw JSON
  const hasLiteralTab = sourcemapContent.includes("\t");
  expect(hasLiteralTab).toBe(false);
});
