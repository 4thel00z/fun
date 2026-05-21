import { spawnSync } from "fun";
import { describe, expect, it } from "fun:test";
import { readFileSync } from "fs";
import { funEnv, funExe } from "harness";
import { join } from "path";

describe("text-loader", () => {
  const fixtures = [
    ["dynamic-import reloaded 10000 times", "text-loader-fixture-dynamic-import-stress.ts"],
    ["dynamic-import", "text-loader-fixture-dynamic-import.ts"],
    ["import", "text-loader-fixture-import.ts"],
    ["require", "text-loader-fixture-require.ts"],
  ] as const;
  for (let [kind, path] of fixtures) {
    describe("should load text", () => {
      it(`using ${kind}`, () => {
        const result = spawnSync({
          cmd: [funExe(), join(import.meta.dir, path)],
          env: funEnv,
          stdout: "pipe",
          stderr: "inherit",
          stdin: "ignore",
        });

        if (result.exitCode !== 0) {
          console.log({ result });
        }

        expect(result.stdout.toString()).toBe("These are words!");
        expect(result.exitCode).toBe(0);
      });
    });
  }

  for (let [entry, path] of [
    // https://github.com/underdoc-org/fun/issues/10206
    ["text-loader-fixture-import-nonascii.ts", "text-loader-fixture-text-file.nonascii.txt"],
    ["text-loader-fixture-import-latin1.ts", "text-loader-fixture-text-file.latin1.txt"],
    // https://github.com/underdoc-org/fun/issues/3449
    ["text-loader-fixture-import-backslashes.ts", "text-loader-fixture-text-file.backslashes.txt"],
  ]) {
    describe("should load non-ASCII text", () => {
      it(`${entry}`, async () => {
        const src = join(import.meta.dir, entry);
        const result = spawnSync({
          cmd: [funExe(), src],
          env: funEnv,
          stdout: "pipe",
          stderr: "inherit",
          stdin: "ignore",
        });

        if (result.exitCode !== 0) {
          console.log({ result });
        }

        const absolute = join(import.meta.dir, path);

        const expected = readFileSync(absolute, "utf8");
        const source = readFileSync(src, "utf8");
        expect(result.stdout.toString()).toBe(expected);

        // Also test that `type: "text"` has higher precedence than the file extension.
        expect((await import(src, { with: { type: "text" } })).default).toBe(source);

        expect(result.exitCode).toBe(0);
      });
    });
  }
});
