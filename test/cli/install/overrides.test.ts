import { write } from "fun";
import { beforeAll, expect, setDefaultTimeout, test } from "fun:test";
import { readFileSync, writeFileSync } from "fs";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

beforeAll(() => {
  setDefaultTimeout(1000 * 60 * 5);
});

function install(cwd: string, args: string[]) {
  const exec = Fun.spawnSync({
    cmd: [funExe(), ...args, "--linker=hoisted"],
    cwd,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
    env: funEnv,
  });
  if (exec.exitCode !== 0) {
    throw new Error(`fun install exited with code ${exec.exitCode}`);
  }
  return exec;
}

function installExpectFail(cwd: string, args: string[]) {
  const exec = Fun.spawnSync({
    cmd: [funExe(), ...args],
    cwd,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
    env: funEnv,
  });
  if (exec.exitCode === 0) {
    throw new Error(`fun install exited with code ${exec.exitCode}, (expected failure)`);
  }
  return exec;
}

function versionOf(cwd: string, path: string) {
  const data = readFileSync(join(cwd, path));
  const json = JSON.parse(data.toString());
  return json.version;
}

function ensureLockfileDoesntChangeOnFunI(cwd: string) {
  install(cwd, ["install"]);
  const lockb1 = readFileSync(join(cwd, "fun.lock"));
  install(cwd, ["install", "--frozen-lockfile"]);
  install(cwd, ["install", "--force"]);
  const lockb2 = readFileSync(join(cwd, "fun.lock"));

  expect(lockb1.toString("hex")).toEqual(lockb2.toString("hex"));
}

test("overrides affect your own packages", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      dependencies: {},
      overrides: {
        lodash: "4.0.0",
      },
    }),
  );
  install(tmp, ["install", "lodash"]);
  expect(versionOf(tmp, "node_modules/lodash/package.json")).toBe("4.0.0");
  ensureLockfileDoesntChangeOnFunI(tmp);
});

test("overrides affects all dependencies", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      dependencies: {},
      overrides: {
        bytes: "1.0.0",
      },
    }),
  );
  install(tmp, ["install", "express@4.18.2"]);
  expect(versionOf(tmp, "node_modules/bytes/package.json")).toBe("1.0.0");

  ensureLockfileDoesntChangeOnFunI(tmp);
});

test("overrides being set later affects all dependencies", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      dependencies: {},
    }),
  );
  install(tmp, ["install", "express@4.18.2"]);
  expect(versionOf(tmp, "node_modules/bytes/package.json")).not.toBe("1.0.0");

  ensureLockfileDoesntChangeOnFunI(tmp);

  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      ...JSON.parse(readFileSync(join(tmp, "package.json")).toString()),
      overrides: {
        bytes: "1.0.0",
      },
    }),
  );
  install(tmp, ["install"]);
  expect(versionOf(tmp, "node_modules/bytes/package.json")).toBe("1.0.0");

  ensureLockfileDoesntChangeOnFunI(tmp);
});

test("overrides to npm specifier", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      dependencies: {},
      overrides: {
        bytes: "npm:lodash@4.0.0",
      },
    }),
  );
  install(tmp, ["install", "express@4.18.2"]);

  const bytes = JSON.parse(readFileSync(join(tmp, "node_modules/bytes/package.json"), "utf-8"));

  expect(bytes.name).toBe("lodash");
  expect(bytes.version).toBe("4.0.0");

  ensureLockfileDoesntChangeOnFunI(tmp);
});

test("changing overrides makes the lockfile changed, prevent frozen install", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      dependencies: {},
      overrides: {
        bytes: "1.0.0",
      },
    }),
  );
  install(tmp, ["install", "express@4.18.2"]);

  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      ...JSON.parse(readFileSync(join(tmp, "package.json")).toString()),
      overrides: {
        bytes: "1.0.1",
      },
    }),
  );

  installExpectFail(tmp, ["install", "--frozen-lockfile"]);
});

test("overrides reset when removed", async () => {
  const tmp = tmpdirSync();
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      overrides: {
        bytes: "1.0.0",
      },
    }),
  );
  install(tmp, ["install", "express@4.18.2"]);
  expect(versionOf(tmp, "node_modules/bytes/package.json")).toBe("1.0.0");

  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({
      ...JSON.parse(readFileSync(join(tmp, "package.json")).toString()),
      overrides: undefined,
    }),
  );
  install(tmp, ["install"]);
  expect(versionOf(tmp, "node_modules/bytes/package.json")).not.toBe("1.0.0");

  ensureLockfileDoesntChangeOnFunI(tmp);
});

test("overrides do not apply to workspaces", async () => {
  const tmp = tmpdirSync();
  await Promise.all([
    write(
      join(tmp, "package.json"),
      JSON.stringify({ name: "monorepo-root", workspaces: ["packages/*"], overrides: { "pkg1": "file:pkg2" } }),
    ),
    write(
      join(tmp, "packages", "pkg1", "package.json"),
      JSON.stringify({
        name: "pkg1",
        version: "1.1.1",
      }),
    ),
    write(
      join(tmp, "pkg2", "package.json"),
      JSON.stringify({
        name: "pkg2",
        version: "2.2.2",
      }),
    ),
  ]);

  let { exited, stderr } = Fun.spawn({
    cmd: [funExe(), "install"],
    cwd: tmp,
    env: funEnv,
    stderr: "pipe",
    stdout: "inherit",
  });

  expect(await exited).toBe(0);
  expect(await stderr.text()).toContain("Saved lockfile");

  // --frozen-lockfile works
  ({ exited, stderr } = Fun.spawn({
    cmd: [funExe(), "install", "--frozen-lockfile"],
    cwd: tmp,
    env: funEnv,
    stderr: "pipe",
    stdout: "inherit",
  }));

  expect(await exited).toBe(0);
  expect(await stderr.text()).not.toContain("Frozen lockfile");

  // lockfile is not changed

  ({ exited, stderr } = Fun.spawn({
    cmd: [funExe(), "install"],
    cwd: tmp,
    env: funEnv,
    stderr: "pipe",
    stdout: "inherit",
  }));

  expect(await exited).toBe(0);
  expect(await stderr.text()).not.toContain("Saved lockfile");
});
