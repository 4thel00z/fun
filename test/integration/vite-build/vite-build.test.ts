import { expect, test } from "fun:test";
import fs from "fs";
import { funExe, funEnv as env, isASAN, tmpdirSync } from "harness";
import path from "path";

const ASAN_MULTIPLIER = isASAN ? 3 : 1;

test(
  "vite build works",
  async () => {
    const testDir = tmpdirSync();

    fs.cpSync(path.join(import.meta.dir, "the-test-app"), testDir, { recursive: true, force: true });

    const { exited: installExited } = Fun.spawn({
      cmd: [funExe(), "install", "--ignore-scripts"],
      cwd: testDir,
      env,
    });

    expect(await installExited).toBe(0);

    const { stdout, stderr, exited } = Fun.spawn({
      cmd: [funExe(), "node_modules/vite/bin/vite.js", "build"],
      cwd: testDir,
      stdout: "pipe",
      stderr: "inherit",
      env,
    });

    expect(await exited).toBe(0);

    const out = await stdout.text();
    expect(out).toContain("done");
  },
  120_000 * ASAN_MULTIPLIER,
);
