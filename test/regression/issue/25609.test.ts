import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// https://github.com/underdoc-org/fun/issues/25609
test("empty object in spread with DCE does not produce invalid syntax", async () => {
  using dir = tempDir("25609", {
    "chunk.js": `module.exports=()=>{var a,b=({...a,x:{}},0)};`,
    "index.js": `require('./chunk.js');`,
  });

  // This should not throw a syntax error when requiring the module
  await using proc = Fun.spawn({
    cmd: [funExe(), "index.js"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});
