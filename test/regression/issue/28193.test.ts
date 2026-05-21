import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("fun install prints error when security scanner is unavailable", async () => {
  using dir = tempDir("issue-28193", {
    "package.json": JSON.stringify({
      name: "test-28193",
      dependencies: {
        "is-even": "1.0.0",
      },
    }),
    "funfig.toml": `[install.security]\nscanner = "@nonexistent-scanner/does-not-exist"\n`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "install"],
    env: { ...funEnv, FUN_INSTALL_CACHE_DIR: String(dir) + "/.cache" },
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should print an error message about the scanner failure, not exit silently
  expect(stderr).toContain("security scanner");
  expect(exitCode).toBe(1);
}, 30_000);

test("fun install prints error when scanner package is invalid", async () => {
  // When the scanner is a devDependency but not a valid scanner module,
  // the install should fail with a clear error message
  using dir = tempDir("issue-28193-invalid", {
    "package.json": JSON.stringify({
      name: "test-28193-invalid",
      devDependencies: {
        "is-even": "1.0.0",
      },
    }),
    "funfig.toml": `[install.security]\nscanner = "is-even"\n`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "install"],
    env: { ...funEnv, FUN_INSTALL_CACHE_DIR: String(dir) + "/.cache" },
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should print an error about the scanner, not exit silently
  expect(stderr).toContain("security scanner");
  expect(exitCode).toBe(1);
}, 30_000);
