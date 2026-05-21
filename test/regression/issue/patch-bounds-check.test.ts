import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot as normalizeFunSnapshot_, tempDirWithFiles } from "harness";

const normalizeFunSnapshot = (str: string) => {
  str = normalizeFunSnapshot_(str);
  str = str.replace(/.*Resolved, downloaded and extracted.*\n?/g, "");
  str = str.replaceAll("fstatat()", "stat()");
  str = str.replace(/ \(v[\d.]+ available\)/g, "");
  return str;
};

test("patch application should handle out-of-bounds line numbers gracefully", async () => {
  const dir = tempDirWithFiles("patch-bounds-test", {
    "package.json": JSON.stringify({
      name: "test-pkg",
      version: "1.0.0",
      dependencies: {
        "lodash": "4.17.21",
      },
      patchedDependencies: {
        "lodash@4.17.21": "patches/lodash+4.17.21.patch",
      },
    }),
    "patches/lodash+4.17.21.patch": `--- a/index.js
+++ b/index.js
@@ -1000,3 +1000,4 @@
 module.exports = require('./lodash');
 
 // This line doesn't exist but the patch says it does
+// Add this line way beyond the actual file bounds`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "install", "--linker=hoisted"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should fail gracefully with proper error message, not crash
  expect(exitCode).toBe(1);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "Resolving dependencies
    error: failed applying patch file: EINVAL: Invalid argument (stat())
    error: failed to apply patchfile (patches/lodash+4.17.21.patch)"
  `);
  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`"fun install <version> (<revision>)"`);
});

test("patch application should handle deletion beyond file bounds", async () => {
  const dir = tempDirWithFiles("patch-deletion-bounds-test", {
    "package.json": JSON.stringify({
      name: "test-pkg",
      version: "1.0.0",
      dependencies: {
        "lodash": "4.17.21",
      },
      patchedDependencies: {
        "lodash@4.17.21": "patches/lodash+4.17.21.patch",
      },
    }),
    "patches/lodash+4.17.21.patch": `--- a/index.js
+++ b/index.js
@@ -1,5 +1,3 @@
 module.exports = require('./lodash');
-line 2
-line 3
-line 4
-line 5`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "install", "--linker=hoisted"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should fail gracefully, not crash
  expect(exitCode).toBe(1);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "Resolving dependencies
    error: failed to parse patchfile: hunk_header_integrity_check_failed
    error: failed to apply patchfile (patches/lodash+4.17.21.patch)"
  `);
  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`"fun install <version> (<revision>)"`);
});

test("patch application should work correctly with valid patches", async () => {
  const dir = tempDirWithFiles("patch-valid-test", {
    "package.json": JSON.stringify({
      name: "test-pkg",
      version: "1.0.0",
      dependencies: {
        "lodash": "4.17.21",
      },
      patchedDependencies: {
        "lodash@4.17.21": "patches/lodash+4.17.21.patch",
      },
    }),
    "patches/lodash+4.17.21.patch": `--- a/index.js
+++ b/index.js
@@ -1 +1,2 @@
+// Valid patch comment
 module.exports = require('./lodash');`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "install", "--linker=hoisted"],
    env: funEnv,
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Valid patch should succeed
  expect(exitCode).toBe(0);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "Resolving dependencies
    Saved lockfile"
  `);
  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`
    "fun install <version> (<revision>)

    + lodash@4.17.21

    1 package installed"
  `);

  // Verify the patch was applied
  const patchedFile = await Fun.file(`${dir}/node_modules/lodash/index.js`).text();
  expect(patchedFile).toMatchInlineSnapshot(`
    "// Valid patch comment
    module.exports = require('./lodash');"
  `);
});
