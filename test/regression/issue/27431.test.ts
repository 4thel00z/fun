import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows, tempDir } from "harness";
import { join } from "path";

test.if(isWindows)("standalone worker does not crash when autoloadDotenv is disabled and .env exists", async () => {
  const target = process.arch === "arm64" ? "fun-windows-aarch64" : "fun-windows-x64";

  using dir = tempDir("issue-27431", {
    ".env": "TEST_VAR=from_dotenv\n",
    "entry.ts": 'console.log(process.env.TEST_VAR || "not found")\nnew Worker("./worker.ts")\n',
    "worker.ts": "",
    "build.ts": `
      await Fun.build({
        entrypoints: ["./entry.ts", "./worker.ts"],
        compile: {
          autoloadDotenv: false,
          target: "${target}",
          outfile: "./app.exe",
        },
      });
    `,
  });

  await using build = Fun.spawn({
    cmd: [funExe(), join(String(dir), "build.ts")],
    env: funEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [, buildStderr, buildExitCode] = await Promise.all([build.stdout.text(), build.stderr.text(), build.exited]);

  expect(buildExitCode).toBe(0);
  expect(buildStderr).toBe("");

  await using proc = Fun.spawn({
    cmd: [join(String(dir), "app.exe")],
    env: funEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("not found");
  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
});
