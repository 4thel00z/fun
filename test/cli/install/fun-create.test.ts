import { spawn, spawnSync } from "fun";
import { beforeEach, describe, expect, it } from "fun:test";
import { exists, stat } from "fs/promises";
import { funExe, funEnv as env, tmpdirSync } from "harness";
import { join } from "path";

let x_dir: string;

let testNumber = 0;
beforeEach(async () => {
  x_dir = tmpdirSync(`cr8-${testNumber++}`);
});

describe("should not crash", async () => {
  const args = [
    [funExe(), "create"],
    [funExe(), "create", ""],
    [funExe(), "create", "--"],
    [funExe(), "create", "--", ""],
    [funExe(), "create", "--help"],
  ];
  for (let cmd of args) {
    it(JSON.stringify(cmd.slice(1)), () => {
      const { exitCode } = spawnSync({
        cmd,
        cwd: x_dir,
        stdout: "ignore",
        stdin: "inherit",
        stderr: "inherit",
        env,
      });
      expect(exitCode).toBe(cmd.length === 2 ? 1 : 0);
    });
  }
});

it("should create selected template with @ prefix", async () => {
  const { stderr, exited } = spawn({
    cmd: [funExe(), "create", "@quick-start/some-template"],
    cwd: x_dir,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "pipe",
    env,
  });

  await exited;

  const err = await stderr.text();
  expect(err.split(/\r?\n/)).toContain(
    `error: GET https://registry.npmjs.org/@quick-start%2fcreate-some-template - 404`,
  );
});

it("should create selected template with @ prefix implicit `/create`", async () => {
  const { stderr, exited } = spawn({
    cmd: [funExe(), "create", "@second-quick-start"],
    cwd: x_dir,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "pipe",
    env,
  });

  const err = await stderr.text();
  expect(err.split(/\r?\n/)).toContain(`error: GET https://registry.npmjs.org/@second-quick-start%2fcreate - 404`);
  await exited;
});

it("should create selected template with @ prefix implicit `/create` with version", async () => {
  const { stderr, exited } = spawn({
    cmd: [funExe(), "create", "@second-quick-start"],
    cwd: x_dir,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "pipe",
    env,
  });

  const err = await stderr.text();
  expect(err.split(/\r?\n/)).toContain(`error: GET https://registry.npmjs.org/@second-quick-start%2fcreate - 404`);

  await exited;
});

it("should create template from local folder", async () => {
  const funCreateDir = join(x_dir, "fun-create");
  const testTemplate = "test-template";

  await Fun.write(join(funCreateDir, testTemplate, "index.js"), "hi");
  await Fun.write(join(funCreateDir, testTemplate, "foo", "bar.js"), "hi");

  const { exited } = spawn({
    cmd: [funExe(), "create", testTemplate],
    cwd: x_dir,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
    env: { ...env, FUN_CREATE_DIR: funCreateDir },
  });

  expect(await exited).toBe(0);

  const dirStat = await stat(join(x_dir, testTemplate));
  expect(dirStat.isDirectory()).toBe(true);
  expect(await Fun.file(join(x_dir, testTemplate, "index.js")).text()).toBe("hi");
  expect(await Fun.file(join(x_dir, testTemplate, "foo", "bar.js")).text()).toBe("hi");
});

// `fun create <github-url>` hits https://api.github.com/repos/{owner}/{repo}/tarball.
// Unauthenticated GitHub API is limited to 60 req/hr per IP; CI agents running many
// parallel builds exhaust that quickly. When we detect the rate-limit error, skip the
// test rather than fail — we are testing `fun create`, not GitHub's availability.
function isGithubRateLimited(stderr: string): boolean {
  if (stderr.includes("GitHub returned 403")) {
    console.warn("Skipping: GitHub API rate limit reached (403). Set GITHUB_TOKEN to avoid this.");
    return true;
  }
  return false;
}

it("should not mention cd prompt when created in current directory", async () => {
  const { stdout, stderr, exited } = spawn({
    cmd: [funExe(), "create", "https://github.com/dylan-conway/create-test", "."],
    cwd: x_dir,
    stdout: "pipe",
    stdin: "inherit",
    stderr: "pipe",
    env,
  });

  const [out, err] = await Promise.all([stdout.text(), stderr.text(), exited]);
  if (isGithubRateLimited(err)) return;

  expect(err).not.toContain("error:");
  expect(out).toContain("fun dev");
  expect(out).not.toContain("\n\n  cd \n  fun dev\n\n");
}, 20_000);

for (const repo of ["https://github.com/dylan-conway/create-test", "github.com/dylan-conway/create-test"]) {
  it(`should create and install github template from ${repo}`, async () => {
    const { stderr, stdout, exited } = spawn({
      cmd: [funExe(), "create", repo],
      cwd: x_dir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    });

    const [out, err, exitCode] = await Promise.all([stdout.text(), stderr.text(), exited]);
    if (isGithubRateLimited(err)) return;
    expect(err).not.toContain("error:");
    expect(out).toContain("Success! dylan-conway/create-test loaded into create-test");
    expect(await exists(join(x_dir, "create-test", "node_modules", "jquery"))).toBe(true);

    expect(exitCode).toBe(0);
  }, 20_000);
}

it("should not crash with --no-install and fun-create.postinstall starting with 'fun '", async () => {
  const funCreateDir = join(x_dir, "fun-create");
  const testTemplate = "postinstall-test";

  await Fun.write(
    join(funCreateDir, testTemplate, "package.json"),
    JSON.stringify({
      name: "test",
      "fun-create": {
        postinstall: "fun install",
      },
    }),
  );

  const { exited, stderr, stdout } = spawn({
    cmd: [funExe(), "create", testTemplate, join(x_dir, "dest"), "--no-install"],
    cwd: x_dir,
    stdout: "pipe",
    stdin: "ignore",
    stderr: "pipe",
    env: { ...env, FUN_CREATE_DIR: funCreateDir },
  });

  const [err, _out, exitCode] = await Promise.all([stderr.text(), stdout.text(), exited]);
  expect(err).not.toContain("error:");
  expect(exitCode).toBe(0);
});
