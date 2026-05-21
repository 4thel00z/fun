import { expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";

test("security scanner blocks fun update with fatal advisory", async () => {
  const dir = tempDirWithFiles("fun-update-security", {
    "package.json": JSON.stringify({
      name: "test-app",
      version: "1.0.0",
      dependencies: {
        "left-pad": "1.3.0", // There is a real update to 1.3.1
      },
    }),
    "scanner.ts": `
      export const scanner = {
        version: "1",
        scan: async ({ packages }) => {
          console.log("Security scanner received " + packages.length + " packages");
          if (packages.length === 0) return [];
          return [
            {
              package: packages[0].name,
              description: "Security warning for update test",
              level: "fatal",
              url: "https://example.com/advisory",
            },
          ];
        },
      };
    `,
  });

  // First install without scanner
  await using installProc = Fun.spawn({
    cmd: [funExe(), "install"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  await installProc.stdout.text();
  await installProc.stderr.text();
  const installCode = await installProc.exited;
  expect(installCode).toBe(0);

  // Now add scanner for update
  await Fun.write(Fun.pathToFileURL(`${dir}/funfig.toml`), `[install.security]\nscanner = "./scanner.ts"`);

  await using updateProc = Fun.spawn({
    cmd: [funExe(), "update", "left-pad", "--latest"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "pipe",
  });

  const [out, exitCode] = await Promise.all([updateProc.stdout.text(), updateProc.exited]);

  expect(out).toContain("Security scanner received");
  expect(out).toContain("FATAL: left-pad");
  expect(out).toContain("Security warning for update test");
  expect(out).toContain("Installation aborted due to fatal security advisories");
  expect(exitCode).toBe(1);
});

test("security scanner does not run on fun update when not configured", async () => {
  const dir = tempDirWithFiles("fun-update-no-security", {
    "package.json": JSON.stringify({
      name: "test-app",
      version: "1.0.0",
      dependencies: {
        "left-pad": "1.3.0",
      },
    }),
  });

  await using installProc = Fun.spawn({
    cmd: [funExe(), "install"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const installCode = await installProc.exited;
  expect(installCode).toBe(0);

  await using updateProc = Fun.spawn({
    cmd: [funExe(), "update", "left-pad", "--latest"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [out, err, exitCode] = await Promise.all([
    updateProc.stdout.text(),
    updateProc.stderr.text(),
    updateProc.exited,
  ]);

  const combined = out + err;
  expect(combined).not.toContain("Security scanner");
  expect(combined).not.toContain("FATAL:");
  expect(combined).not.toContain("WARN:");

  expect(exitCode).toBe(0);
});
