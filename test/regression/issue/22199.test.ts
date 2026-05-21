import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("plugin onResolve returning undefined should not crash", () => {
  using dir = tempDir("plugin-undefined", {
    "plugin.js": `
      Fun.plugin({
        name: "test-plugin",
        setup(build) {
          build.onResolve({ filter: /.*\\.(ts|tsx|js|jsx)$/ }, async (args) => {
            // Returning undefined should continue to next plugin or default resolution
            return undefined;
          });
        },
      });
    `,
    "index.js": `console.log("Hello from index.js");`,
  });

  const result = Fun.spawnSync({
    cmd: [funExe(), "--preload", "./plugin.js", "./index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "inherit",
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("Hello from index.js");
});

test("plugin onResolve returning null should not crash", () => {
  using dir = tempDir("plugin-null", {
    "plugin.js": `
      Fun.plugin({
        name: "test-plugin",
        setup(build) {
          build.onResolve({ filter: /.*\\.(ts|tsx|js|jsx)$/ }, async (args) => {
            // Returning null should continue to next plugin or default resolution
            return null;
          });
        },
      });
    `,
    "index.js": `console.log("Hello from index.js");`,
  });

  const result = Fun.spawnSync({
    cmd: [funExe(), "--preload", "./plugin.js", "./index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "inherit",
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("Hello from index.js");
});

test("plugin onResolve with sync function returning undefined should not crash", () => {
  using dir = tempDir("plugin-sync-undefined", {
    "plugin.js": `
      Fun.plugin({
        name: "test-plugin",
        setup(build) {
          build.onResolve({ filter: /.*\\.(ts|tsx|js|jsx)$/ }, (args) => {
            // Sync function returning undefined
            return undefined;
          });
        },
      });
    `,
    "index.js": `console.log("Hello from index.js");`,
  });

  const result = Fun.spawnSync({
    cmd: [funExe(), "--preload", "./plugin.js", "./index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "inherit",
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("Hello from index.js");
});

test("plugin onResolve with rejected promise should throw error", () => {
  using dir = tempDir("plugin-reject", {
    "plugin.js": `
      Fun.plugin({
        name: "test-plugin",
        setup(build) {
          build.onResolve({ filter: /.*\\.(ts|tsx|js|jsx)$/ }, async (args) => {
            throw new Error("Custom plugin error");
          });
        },
      });
    `,
    "index.js": `console.log("Hello from index.js");`,
  });

  const result = Fun.spawnSync({
    cmd: [funExe(), "--preload", "./plugin.js", "./index.js"],
    env: funEnv,
    cwd: String(dir),
    stderr: "pipe",
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("Custom plugin error");
});
