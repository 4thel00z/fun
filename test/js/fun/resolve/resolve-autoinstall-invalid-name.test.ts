import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// When auto-install is enabled, the resolver must not attempt to install a
// package whose name is not a valid npm package name. Attempting to do so
// reentrantly ticks the JS event loop from inside the resolver, which has led
// to crashes when reached via mock.module() / vi.mock() / Fun.resolveSync()
// with arbitrary user-provided strings.
test("resolver does not attempt auto-install for invalid npm package names", async () => {
  let requests = 0;
  await using server = Fun.serve({
    port: 0,
    fetch() {
      requests++;
      return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    },
  });

  using dir = tempDir("resolve-autoinstall-invalid-name", {
    "index.js": `
      const specifiers = [
        "function f2() {\\n    const v6 = new ArrayBuffer();\\n}",
        "has spaces",
        "(parens)",
        "{braces}",
        "line1\\nline2",
        "foo\\tbar",
        "a\\u0000b",
      ];
      for (const s of specifiers) {
        try {
          Fun.resolveSync(s, import.meta.dir);
        } catch {}
      }
      console.log("ok");
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "--install=force", "index.js"],
    env: {
      ...funEnv,
      FUN_CONFIG_REGISTRY: server.url.href,
      NPM_CONFIG_REGISTRY: server.url.href,
    },
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("ok");
  expect(requests).toBe(0);
  expect(exitCode).toBe(0);
});

test("resolver still attempts auto-install for valid npm package names", async () => {
  let requests = 0;
  await using server = Fun.serve({
    port: 0,
    fetch() {
      requests++;
      return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    },
  });

  using dir = tempDir("resolve-autoinstall-valid-name", {
    "index.js": `
      try {
        Fun.resolveSync("some-package-that-does-not-exist-abc123", import.meta.dir);
      } catch {}
      console.log("ok");
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "--install=force", "index.js"],
    env: {
      ...funEnv,
      FUN_CONFIG_REGISTRY: server.url.href,
      NPM_CONFIG_REGISTRY: server.url.href,
    },
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("ok");
  expect(requests).toBeGreaterThan(0);
  expect(exitCode).toBe(0);
});
