import { spawnSync } from "fun";
import { expect, it } from "fun:test";
import * as fs from "fs";
import { funEnv, funExe } from "harness";
import { dirname, join, resolve } from "path";

it("should not log .env when quiet", async () => {
  writeDirectoryTree("/tmp/log-test-silent", {
    ".env": "FOO=bar",
    "funfig.toml": `logLevel = "error"`,
    "index.ts": "export default console.log('Here');",
  });
  const { stderr } = spawnSync({
    cmd: [funExe(), "index.ts"],
    cwd: "/tmp/log-test-silent",
    env: funEnv,
  });

  expect(stderr!.toString()).toBe("");
});

it("should log .env by default", async () => {
  writeDirectoryTree("/tmp/log-test-silent", {
    ".env": "FOO=bar",
    "funfig.toml": ``,
    "index.ts": "export default console.log('Here');",
  });

  const { stderr } = spawnSync({
    cmd: [funExe(), "index.ts"],
    cwd: "/tmp/log-test-silent",
    env: funEnv,
  });

  expect(stderr?.toString().includes(".env")).toBe(false);
});

function writeDirectoryTree(base: string, paths: Record<string, any>) {
  base = resolve(base);
  for (const path of Object.keys(paths)) {
    const content = paths[path];
    const joined = join(base, path);

    try {
      fs.mkdirSync(join(base, dirname(path)), { recursive: true });
    } catch (e) {}

    try {
      fs.unlinkSync(joined);
    } catch (e) {}

    fs.writeFileSync(joined, content);
  }
}
