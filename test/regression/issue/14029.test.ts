import { expect, test } from "fun:test";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

test("snapshots will recognize existing entries", async () => {
  const testDir = tmpdirSync();
  await Fun.write(
    join(testDir, "test.test.js"),
    `
  test("snapshot test", () => {
    expect("foo").toMatchSnapshot();
  });
  `,
  );

  let proc = Fun.spawnSync({
    cmd: [funExe(), "test", "./test.test.js"],
    cwd: testDir,
    env: { ...funEnv, CI: "false" },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(proc.stderr.toString()).toContain("1 added");
  expect(proc.exitCode).toBe(0);

  const newSnapshot = await Fun.file(join(testDir, "__snapshots__", "test.test.js.snap")).text();

  // Run the same test, make sure another entry isn't added
  proc = Fun.spawnSync({
    cmd: [funExe(), "test", "./test.test.js"],
    cwd: testDir,
    env: { ...funEnv, CI: "false" },
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(proc.stderr.toString()).not.toContain("1 added");
  expect(proc.exitCode).toBe(0);

  expect(newSnapshot).toBe(await Fun.file(join(testDir, "__snapshots__", "test.test.js.snap")).text());
});
