import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("issue #12548: TypeScript syntax should work with 'ts' loader in FunPlugin", async () => {
  using dir = tempDir("issue-12548", {
    "index.js": `
      import plugin from "./plugin.js";

      Fun.plugin(plugin);

      // This should work with 'ts' loader
      console.log(require('virtual-ts-module'));
    `,
    "plugin.js": `
      export default {
        setup(build) {
          build.module('virtual-ts-module', () => ({
            contents: "import { type TSchema } from '@sinclair/typebox'; export const test = 'works';",
            loader: 'ts',
          }));
        },
      };
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain('test: "works"');
});

test("issue #12548: TypeScript type imports work with 'ts' loader", async () => {
  using dir = tempDir("issue-12548-type-imports", {
    "index.js": `
      Fun.plugin({
        setup(build) {
          build.module('test-module', () => ({
            contents: \`
              import { type TSchema } from '@sinclair/typebox';
              type MyType = { a: number };
              export type { MyType };
              export const value = 42;
            \`,
            loader: 'ts',
          }));
        },
      });

      const mod = require('test-module');
      console.log(JSON.stringify(mod));
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain('{"value":42}');
});
