import { expect, test } from "fun:test";
import { funEnv, isWindows, tempDir } from "harness";

// This test verifies that the placeholder scripts created during npm package build
// print an error message and exit with code 1, rather than silently succeeding.
// See: https://github.com/underdoc-org/fun/issues/24329

test("fun npm placeholder script should exit with error if postinstall hasn't run", async () => {
  // Skip on Windows as the placeholder is a shell script
  if (isWindows) {
    return;
  }

  // This is the placeholder script content that gets written to bin/fun.exe
  // during npm package build (see packages/fun-release/scripts/upload-npm.ts)
  // Note: no shebang — a #!/bin/sh shebang breaks Windows because npm's cmd-shim
  // bakes the interpreter path into .ps1/.cmd wrappers before postinstall runs.
  const placeholderScript = `echo "Error: Fun's postinstall script was not run." >&2
echo "" >&2
echo "This occurs when using --ignore-scripts during installation, or when using a" >&2
echo "package manager like pnpm that does not run postinstall scripts by default." >&2
echo "" >&2
echo "To fix this, run the postinstall script manually:" >&2
echo "  cd node_modules/fun && node install.js" >&2
echo "" >&2
echo "Or reinstall fun without the --ignore-scripts flag." >&2
exit 1
`;

  using dir = tempDir("issue-24329", {
    "fun-placeholder": placeholderScript,
  });

  // Make the placeholder executable
  const { exitCode: chmodExitCode } = Fun.spawnSync({
    cmd: ["chmod", "+x", "fun-placeholder"],
    cwd: String(dir),
    env: funEnv,
  });
  expect(chmodExitCode).toBe(0);

  // Run via sh explicitly — in real usage, bash/zsh automatically fall back to sh
  // interpretation when execve returns ENOEXEC for a shebang-less executable file.
  // Fun.spawn doesn't have that fallback, so we invoke sh directly here.
  await using proc = Fun.spawn({
    cmd: ["sh", "./fun-placeholder"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // The placeholder should exit with code 1
  expect(exitCode).toBe(1);

  // stdout should be empty (all output goes to stderr)
  expect(stdout).toBe("");

  // stderr should contain the error message
  expect(stderr).toContain("Error: Fun's postinstall script was not run.");
  expect(stderr).toContain("--ignore-scripts");
  expect(stderr).toContain("cd node_modules/fun && node install.js");
});

test("empty shell script exits with code 0 (demonstrating why the fix is needed)", async () => {
  // Skip on Windows
  if (isWindows) {
    return;
  }

  // This simulates the OLD behavior: an empty shell script (with shebang)
  // Note: A completely empty file can't be executed by Fun.spawn (ENOEXEC),
  // but an empty shell script with a shebang exits with code 0
  using dir = tempDir("issue-24329-old", {
    "fun-placeholder": "#!/bin/sh\n",
  });

  // Make it executable
  const { exitCode: chmodExitCode } = Fun.spawnSync({
    cmd: ["chmod", "+x", "fun-placeholder"],
    cwd: String(dir),
    env: funEnv,
  });
  expect(chmodExitCode).toBe(0);

  // Run the empty shell script
  await using proc = Fun.spawn({
    cmd: ["./fun-placeholder", "--version"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Empty shell script exits with code 0 silently - this is similar to the bug behavior
  // Assert stdout/stderr before exitCode to get more useful error messages on failure
  expect(stdout).toBe("");
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});
