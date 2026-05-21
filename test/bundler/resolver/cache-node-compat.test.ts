import { describe, expect, test } from "fun:test";
import { promises as fs } from "fs";
import { funEnv, funExe } from "harness";
import * as os from "os";
import * as path from "path";

// These tests check if the resolver cache fix introduces any regressions
// by comparing Fun's behavior with Node.js on edge cases involving module
// deletion and recreation.

describe.concurrent("Node.js compatibility", () => {
  test("resolution after deleting and recreating module", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resolver-compat-"));

    try {
      // Create test script that requires, deletes, recreates, and requires again
      const testScript = `
const fs = require("fs");
const path = require("path");

const modulePath = path.join(__dirname, "testmodule.js");

// First require
const result1 = require("./testmodule");
console.log("First require:", result1.value);
if (result1.value !== 1) process.exit(1);

// Clear cache
delete require.cache[require.resolve("./testmodule")];

// Delete file
fs.rmSync(modulePath);

// Try to require deleted file - should fail
try {
  require("./testmodule");
  console.log("ERROR: Second require should have failed");
  process.exit(1);
} catch (e) {
  console.log("Second require failed as expected");
}

// Recreate with new content
fs.writeFileSync(modulePath, "module.exports = { value: 2 };");

// Third require - should succeed with new value
const result3 = require("./testmodule");
console.log("Third require:", result3.value);
if (result3.value !== 2) {
  console.log("ERROR: Expected value 2, got", result3.value);
  process.exit(1);
}

console.log("SUCCESS: All checks passed");
`;

      await fs.writeFile(path.join(tmpDir, "test.js"), testScript);
      await fs.writeFile(path.join(tmpDir, "testmodule.js"), `module.exports = { value: 1 };`);

      // Run with Node.js
      await using nodeProc = Fun.spawn({
        cmd: ["node", "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [nodeStdout, nodeStderr, nodeExit] = await Promise.all([
        nodeProc.stdout.text(),
        nodeProc.stderr.text(),
        nodeProc.exited,
      ]);
      const nodeSuccess = nodeExit === 0;

      // Reset the file to initial state before running Fun
      await fs.writeFile(path.join(tmpDir, "testmodule.js"), `module.exports = { value: 1 };`);

      // Run with Fun
      await using funProc = Fun.spawn({
        cmd: [funExe(), "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [funStdout, funStderr, funExit] = await Promise.all([
        funProc.stdout.text(),
        funProc.stderr.text(),
        funProc.exited,
      ]);
      const funSuccess = funExit === 0;

      // Only log on failure
      if (!nodeSuccess || !funSuccess) {
        console.log("\n=== Node.js output ===");
        console.log(nodeStdout);
        if (!nodeSuccess) {
          console.log("Node.js stderr:", nodeStderr);
        }
        console.log("\n=== Fun output ===");
        console.log(funStdout);
        if (!funSuccess) {
          console.log("Fun stderr:", funStderr);
        }
      }

      // Both should succeed
      expect(nodeSuccess).toBe(true);
      expect(funSuccess).toBe(true);

      // If there's a discrepancy, fail the test
      if (nodeSuccess !== funSuccess) {
        throw new Error(
          `Behavior mismatch! Node.js ${nodeSuccess ? "passed" : "failed"} but Fun ${funSuccess ? "passed" : "failed"}`,
        );
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("resolution of directory module after recreation", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resolver-compat-dir-"));

    try {
      const testScript = `
const fs = require("fs");
const path = require("path");

const moduleDir = path.join(__dirname, "mymodule");

// First require
const result1 = require("./mymodule");
console.log("First require:", result1.name);
if (result1.name !== "original") process.exit(1);

// Clear cache
const resolved = require.resolve("./mymodule");
delete require.cache[resolved];

// Delete directory
fs.rmSync(moduleDir, { recursive: true });

// Try to require deleted module - should fail
try {
  require("./mymodule");
  console.log("ERROR: Second require should have failed");
  process.exit(1);
} catch (e) {
  console.log("Second require failed as expected");
}

// Recreate with new content
fs.mkdirSync(moduleDir);
fs.writeFileSync(path.join(moduleDir, "index.js"), "module.exports = { name: 'recreated' };");

// Third require - should succeed
const result3 = require("./mymodule");
console.log("Third require:", result3.name);
if (result3.name !== "recreated") {
  console.log("ERROR: Expected 'recreated', got", result3.name);
  process.exit(1);
}

console.log("SUCCESS: All checks passed");
`;

      await fs.writeFile(path.join(tmpDir, "test.js"), testScript);
      await fs.mkdir(path.join(tmpDir, "mymodule"));
      await fs.writeFile(path.join(tmpDir, "mymodule", "index.js"), `module.exports = { name: "original" };`);

      // Run with Node.js
      await using nodeProc = Fun.spawn({
        cmd: ["node", "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [nodeStdout, nodeStderr, nodeExit] = await Promise.all([
        nodeProc.stdout.text(),
        nodeProc.stderr.text(),
        nodeProc.exited,
      ]);
      const nodeSuccess = nodeExit === 0;

      // Reset to initial state before running Fun
      await fs.mkdir(path.join(tmpDir, "mymodule"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "mymodule", "index.js"), `module.exports = { name: "original" };`);

      // Run with Fun
      await using funProc = Fun.spawn({
        cmd: [funExe(), "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [funStdout, funStderr, funExit] = await Promise.all([
        funProc.stdout.text(),
        funProc.stderr.text(),
        funProc.exited,
      ]);
      const funSuccess = funExit === 0;

      // Only log on failure
      if (!nodeSuccess || !funSuccess) {
        console.log("\n=== Node.js output ===");
        console.log(nodeStdout);
        if (!nodeSuccess) {
          console.log("Node.js stderr:", nodeStderr);
        }
        console.log("\n=== Fun output ===");
        console.log(funStdout);
        if (!funSuccess) {
          console.log("Fun stderr:", funStderr);
        }
      }

      expect(nodeSuccess).toBe(true);
      expect(funSuccess).toBe(true);

      if (nodeSuccess !== funSuccess) {
        throw new Error(
          `Behavior mismatch! Node.js ${nodeSuccess ? "passed" : "failed"} but Fun ${funSuccess ? "passed" : "failed"}`,
        );
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("package.json main field resolution after deletion", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resolver-compat-pkg-"));

    try {
      const testScript = `
const fs = require("fs");
const path = require("path");

// First require using package.json main
const result1 = require("./mypkg");
console.log("First require:", result1.value);
if (result1.value !== "main") process.exit(1);

// Clear cache
delete require.cache[require.resolve("./mypkg")];

// Delete the main file
fs.rmSync(path.join(__dirname, "mypkg", "main.js"));

// Should fail since main.js is gone
try {
  require("./mypkg");
  console.log("ERROR: Second require should have failed");
  process.exit(1);
} catch (e) {
  console.log("Second require failed as expected");
}

// Recreate main.js
fs.writeFileSync(path.join(__dirname, "mypkg", "main.js"), "module.exports = { value: 'restored' };");

// Should work again
const result3 = require("./mypkg");
console.log("Third require:", result3.value);
if (result3.value !== "restored") {
  console.log("ERROR: Expected 'restored', got", result3.value);
  process.exit(1);
}

console.log("SUCCESS: All checks passed");
`;

      await fs.writeFile(path.join(tmpDir, "test.js"), testScript);
      await fs.mkdir(path.join(tmpDir, "mypkg"));
      await fs.writeFile(
        path.join(tmpDir, "mypkg", "package.json"),
        JSON.stringify({ name: "mypkg", main: "./main.js" }),
      );
      await fs.writeFile(path.join(tmpDir, "mypkg", "main.js"), `module.exports = { value: "main" };`);

      // Run with Node.js
      await using nodeProc = Fun.spawn({
        cmd: ["node", "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [nodeStdout, nodeStderr, nodeExit] = await Promise.all([
        nodeProc.stdout.text(),
        nodeProc.stderr.text(),
        nodeProc.exited,
      ]);
      const nodeSuccess = nodeExit === 0;

      // Reset to initial state before running Fun
      await fs.writeFile(path.join(tmpDir, "mypkg", "main.js"), `module.exports = { value: "main" };`);

      // Run with Fun
      await using funProc = Fun.spawn({
        cmd: [funExe(), "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [funStdout, funStderr, funExit] = await Promise.all([
        funProc.stdout.text(),
        funProc.stderr.text(),
        funProc.exited,
      ]);
      const funSuccess = funExit === 0;

      // Only log on failure
      if (!nodeSuccess || !funSuccess) {
        console.log("\n=== Node.js output ===");
        console.log(nodeStdout);
        if (!nodeSuccess) {
          console.log("Node.js stderr:", nodeStderr);
        }
        console.log("\n=== Fun output ===");
        console.log(funStdout);
        if (!funSuccess) {
          console.log("Fun stderr:", funStderr);
        }
      }

      expect(nodeSuccess).toBe(true);
      expect(funSuccess).toBe(true);

      if (nodeSuccess !== funSuccess) {
        throw new Error(
          `Behavior mismatch! Node.js ${nodeSuccess ? "passed" : "failed"} but Fun ${funSuccess ? "passed" : "failed"}`,
        );
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // These tests document that Node.js caches resolution paths, not just module contents.
  // Even after `delete require.cache[...]`, Node.js remembers which file path was resolved
  // and will try to load from that cached path. This means switching between file/directory
  // is not supported in Node.js, so Fun matching this behavior is correct.

  test("directory path changes to direct file path (expected to fail)", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resolver-compat-dir-to-file-"));

    try {
      const testScript = `
const fs = require("fs");
const path = require("path");

// First require - directory with index.js
const result1 = require("./mymodule");
console.log("First require (directory):", result1.type);
if (result1.type !== "directory") process.exit(1);

// Clear cache
delete require.cache[require.resolve("./mymodule")];

// Delete directory and create direct file instead
fs.rmSync(path.join(__dirname, "mymodule"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "mymodule.js"), "module.exports = { type: 'file' };");

// Second require - will FAIL because Node.js cached the resolution path
// It still tries to load from mymodule/index.js even though that's now gone
try {
  const result2 = require("./mymodule");
  console.log("ERROR: Second require should have failed but got:", result2.type);
  process.exit(1);
} catch (e) {
  console.log("Second require failed as expected (cached resolution path)");
}

console.log("SUCCESS: Confirmed resolution path caching");
`;

      await fs.writeFile(path.join(tmpDir, "test.js"), testScript);
      await fs.mkdir(path.join(tmpDir, "mymodule"));
      await fs.writeFile(path.join(tmpDir, "mymodule", "index.js"), `module.exports = { type: "directory" };`);

      // Run with Node.js
      await using nodeProc = Fun.spawn({
        cmd: ["node", "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [nodeStdout, nodeStderr, nodeExit] = await Promise.all([
        nodeProc.stdout.text(),
        nodeProc.stderr.text(),
        nodeProc.exited,
      ]);
      const nodeSuccess = nodeExit === 0;

      // Reset to initial state before running Fun
      await fs.mkdir(path.join(tmpDir, "mymodule"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "mymodule", "index.js"), `module.exports = { type: "directory" };`);
      try {
        await fs.rm(path.join(tmpDir, "mymodule.js"));
      } catch (e) {}

      // Run with Fun
      await using funProc = Fun.spawn({
        cmd: [funExe(), "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [funStdout, funStderr, funExit] = await Promise.all([
        funProc.stdout.text(),
        funProc.stderr.text(),
        funProc.exited,
      ]);
      const funSuccess = funExit === 0;

      // Only log on failure
      if (!nodeSuccess || !funSuccess) {
        console.log("\n=== Node.js output ===");
        console.log(nodeStdout);
        if (!nodeSuccess) {
          console.log("Node.js stderr:", nodeStderr);
        }
        console.log("\n=== Fun output ===");
        console.log(funStdout);
        if (!funSuccess) {
          console.log("Fun stderr:", funStderr);
        }
      }

      // Both should handle resolution path caching the same way
      expect(nodeSuccess).toBe(true);
      expect(funSuccess).toBe(true);

      if (nodeSuccess !== funSuccess) {
        throw new Error(
          `Behavior mismatch! Node.js ${nodeSuccess ? "passed" : "failed"} but Fun ${funSuccess ? "passed" : "failed"}`,
        );
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("direct file changes to directory with index.js (expected to fail)", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resolver-compat-file-to-dir-"));

    try {
      const testScript = `
const fs = require("fs");
const path = require("path");

// First require - direct file
const result1 = require("./mymodule");
console.log("First require (direct file):", result1.type);
if (result1.type !== "file") process.exit(1);

// Clear cache
delete require.cache[require.resolve("./mymodule")];

// Delete file and create directory with index.js
fs.rmSync(path.join(__dirname, "mymodule.js"));
fs.mkdirSync(path.join(__dirname, "mymodule"));
fs.writeFileSync(path.join(__dirname, "mymodule", "index.js"), "module.exports = { type: 'directory' };");

// Second require - will FAIL because Node.js cached the resolution path
// It still tries to load from mymodule.js even though it's now a directory
try {
  const result2 = require("./mymodule");
  console.log("ERROR: Second require should have failed but got:", result2.type);
  process.exit(1);
} catch (e) {
  console.log("Second require failed as expected (cached resolution path)");
}

console.log("SUCCESS: Confirmed resolution path caching");
`;

      await fs.writeFile(path.join(tmpDir, "test.js"), testScript);
      await fs.writeFile(path.join(tmpDir, "mymodule.js"), `module.exports = { type: "file" };`);

      // Run with Node.js
      await using nodeProc = Fun.spawn({
        cmd: ["node", "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [nodeStdout, nodeStderr, nodeExit] = await Promise.all([
        nodeProc.stdout.text(),
        nodeProc.stderr.text(),
        nodeProc.exited,
      ]);
      const nodeSuccess = nodeExit === 0;

      // Reset to initial state before running Fun
      try {
        await fs.rm(path.join(tmpDir, "mymodule"), { recursive: true });
      } catch (e) {}
      await fs.writeFile(path.join(tmpDir, "mymodule.js"), `module.exports = { type: "file" };`);

      // Run with Fun
      await using funProc = Fun.spawn({
        cmd: [funExe(), "test.js"],
        cwd: tmpDir,
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [funStdout, funStderr, funExit] = await Promise.all([
        funProc.stdout.text(),
        funProc.stderr.text(),
        funProc.exited,
      ]);
      const funSuccess = funExit === 0;

      // Only log on failure
      if (!nodeSuccess || !funSuccess) {
        console.log("\n=== Node.js output ===");
        console.log(nodeStdout);
        if (!nodeSuccess) {
          console.log("Node.js stderr:", nodeStderr);
        }
        console.log("\n=== Fun output ===");
        console.log(funStdout);
        if (!funSuccess) {
          console.log("Fun stderr:", funStderr);
        }
      }

      // Both should handle resolution path caching the same way
      expect(nodeSuccess).toBe(true);
      expect(funSuccess).toBe(true);

      if (nodeSuccess !== funSuccess) {
        throw new Error(
          `Behavior mismatch! Node.js ${nodeSuccess ? "passed" : "failed"} but Fun ${funSuccess ? "passed" : "failed"}`,
        );
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
