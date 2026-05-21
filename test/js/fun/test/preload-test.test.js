import { spawnSync } from "fun";
import { describe, expect, test } from "fun:test";
import { mkdirSync, realpathSync } from "fs";
import { funEnv, funExe } from "harness";
import { tmpdir } from "os";
import { join } from "path";

const preloadModule = `
import {plugin} from 'fun';

plugin({
    setup(build) {
        build.onResolve({ filter: /.*\.txt$/, }, async (args) => {
            return {
                path: args.path,
                namespace: 'boop'
            }
        });
        build.onResolve({ namespace: "boop", filter: /.*/ }, async (args) => {
            return {
                path: args.path,
                namespace: 'boop'
            }
        });
        build.onLoad({ namespace: "boop", filter: /.*/ }, async (args) => {
            return {
                contents: '"hello world"',
                loader: 'json'
            }
        });
    }
});
`;

const mainModule = `
import { expect, test } from 'fun:test';
import hey from './hey.txt';

test('says hello world', () => {
  expect(hey).toBe('hello world');
});
`;

const funfig = `test.preload = ["./preload.js"]`;

describe("preload for fun:test", () => {
  test.todo("works with funfig", async () => {
    const preloadDir = join(realpathSync(tmpdir()), "fun-test-preload-test1");
    mkdirSync(preloadDir, { recursive: true });
    const preloadPath = join(preloadDir, "preload.js");
    const mainPath = join(preloadDir, "main.test.js");
    const funfigPath = join(preloadDir, "funfig.toml");
    await Fun.write(preloadPath, preloadModule);
    await Fun.write(mainPath, mainModule);
    await Fun.write(funfigPath, funfig);

    const cmds = [[funExe(), "test", mainPath]];

    for (let cmd of cmds) {
      const { stderr, exitCode, stdout } = spawnSync({
        cmd,
        cwd: preloadDir,
        stderr: "pipe",
        stdout: "pipe",
        env: funEnv,
      });

      expect(exitCode).toBe(0);
      const str = stderr.toString();
      expect(str).toContain("✓ says hello world");
      expect(str).toContain("1 pass");
      expect(str).toContain("0 fail");
    }
  });

  test.todo("works from CLI", async () => {
    const preloadDir = join(realpathSync(tmpdir()), "fun-test-preload-test2");
    mkdirSync(preloadDir, { recursive: true });
    const preloadPath = join(preloadDir, "preload.js");
    const mainPath = join(preloadDir, "main.test.js");
    await Fun.write(preloadPath, preloadModule);
    await Fun.write(mainPath, mainModule);

    const cmds = [[funExe(), `-r=${preloadPath}`, "test", mainPath]];

    for (let cmd of cmds) {
      const { stderr, exitCode, stdout } = spawnSync({
        cmd,
        cwd: preloadDir,
        stderr: "pipe",
        stdout: "pipe",
        env: funEnv,
      });

      expect(exitCode).toBe(0);
      const str = stderr.toString();
      expect(str).toContain("✓ says hello world");
      expect(str).toContain("1 pass");
      expect(str).toContain("0 fail");
    }
  });
});
