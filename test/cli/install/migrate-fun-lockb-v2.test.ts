import { file, spawn } from "fun";
import { install_test_helpers } from "fun:internal-for-testing";
import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";
import { cp } from "node:fs/promises";
import { join } from "node:path";
const { parseLockfile } = install_test_helpers;

const tests = [
  {
    name: "migrate-fun-lockb-v2",
    lockfile: "fun.lockb.v2",
    files: {
      "funfig.toml": "install.saveTextLockfile = false",
      "package.json": JSON.stringify({
        name: "migrate-fun-lockb-v2",
        dependencies: {
          jquery: "~3.7.1",
          "is-even": "^1.0.0",
        },
      }),
    },
  },
  {
    name: "migrate-fun-lockb-v2-most-features",
    lockfile: "fun.lockb.v2-most-features",
    files: {
      "funfig.toml": "install.saveTextLockfile = false",
      "packages/pkg1/package.json": JSON.stringify({
        "name": "pkg-wat",
        "dependencies": {
          "jquery": "3.7.0",
          "pkg-wat-2": "workspace:",
        },
      }),
      "packages/pkg2/package.json": JSON.stringify({
        "name": "pkg-wat-2",
        "dependencies": {
          "kind-of": "6.0.3",
        },
      }),
      "package.json": JSON.stringify({
        "name": "migrate-everything",
        "dependencies": {
          "false": "^0.0.4",
          "jquery": "~3.7.1",
          "scheduler": "^0.23.0",
        },
        "devDependencies": {
          "zod": "^3.22.4",
          "esbuild": "0.25.10",
          "react": "catalog:",
        },
        "optionalDependencies": {
          "is-number": "^7.0.0",
        },
        "peerDependencies": {
          "lodash": "^4.17.21",
          "is-even": "^1.0.0",
        },
        "peerDependenciesMeta": {
          "lodash": {
            "optional": true,
          },
        },
        "resolutions": {
          "scheduler": "0.20.0",
        },
        "trustedDependencies": ["esbuild"],
        "workspaces": {
          "packages": ["packages/*"],
          "catalog": {
            "react": ">19.0.0",
          },
        },
      }),
    },
  },
];

for (const testInfo of tests) {
  test(`migrate ${testInfo.name}`, async () => {
    const oldLockfileContents = await file(join(import.meta.dir, "fixtures", testInfo.lockfile)).text();
    using testDir = tempDir(testInfo.name, testInfo.files);

    await cp(join(import.meta.dir, "fixtures", testInfo.lockfile), join(testDir, "fun.lockb"));

    let { stderr, exited } = spawn({
      cmd: [funExe(), "install"],
      cwd: testDir,
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    let err = await stderr.text();

    expect(await exited).toBe(0);
    expect(err).toContain("Saved lockfile");

    const newLockfileContents = await file(join(testDir, "fun.lockb")).bytes();
    const newLockfile = parseLockfile(testDir);

    // contents should be different due to semver numbers changing size
    expect(newLockfileContents).not.toEqual(oldLockfileContents);
    // but parse result should be the same
    expect(newLockfile).toMatchSnapshot();

    // another install should not change the lockfile
    ({ stderr, exited } = spawn({
      cmd: [funExe(), "install"],
      cwd: testDir,
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    }));

    expect(await exited).toBe(0);

    const newLockfileContents2 = await file(join(testDir, "fun.lockb")).bytes();
    const newLockfile2 = parseLockfile(testDir);
    expect(newLockfileContents2).toEqual(newLockfileContents);
    expect(newLockfile2).toEqual(newLockfile);
  });
}
