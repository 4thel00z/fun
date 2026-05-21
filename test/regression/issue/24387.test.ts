import { funEnv, funExe } from "harness";
import { join } from "path";

test("regression: require()ing a module with TLA should error and then wipe the module cache, so that importing it again works", async () => {
  const proc = Fun.spawn({
    cmd: [funExe(), "run", "--smol", join(import.meta.dir, "24387", "entry.js")],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const { stdout, stderr } = proc;

  expect(await stderr.text()).toBe("");
  expect(await stdout.text()).toMatchInlineSnapshot(`
    "require() async module "<the module>" is unsupported. use "await import()" instead.
    Module {
      foo: 67,
    }
    "
  `);
  expect(await proc.exited).toBe(0);
});
