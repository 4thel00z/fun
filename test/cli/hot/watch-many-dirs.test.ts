import { spawn } from "fun";
import { describe, expect, test } from "fun:test";
import { funEnv, funExe, forEachLine, isASAN, isCI, tempDirWithFiles } from "harness";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

describe("--hot with many directories", () => {
  // TODO: fix watcher thread exit handling so the main thread waits for the
  // watcher thread to exit. This causes a crash inside the libc exit() function
  // that triggers in ASAN.
  test.skipIf(isCI && isASAN)(
    "handles 129 directories being updated simultaneously",
    async () => {
      // Create initial test structure
      const tmpdir = tempDirWithFiles("hot-many-dirs", {
        "entry.js": `console.log('Initial load');`,
      });

      // Generate 129 directories with files
      const dirCount = 129;
      const maxCount = 3;
      for (let i = 0; i < dirCount; i++) {
        const dirName = `dir-${i.toString().padStart(4, "0")}`;
        const dirPath = join(tmpdir, dirName);
        mkdirSync(dirPath, { recursive: true });

        // Create an index.js in each directory
        writeFileSync(join(dirPath, "index.js"), `export const value${i} = ${i};`);
      }

      // Create main index that imports all directories
      const imports = Array.from({ length: dirCount }, (_, i) => {
        const dirName = `dir-${i.toString().padStart(4, "0")}`;
        return `import * as dir${i} from './${dirName}/index.js';`;
      }).join("\n");

      writeFileSync(
        join(tmpdir, "entry.js"),
        `
${imports}
console.log('Loaded', ${dirCount}, 'directories');
(globalThis.reloaded ??= 0);
if (globalThis.reloaded++ >= ${maxCount}) process.exit(0);
`,
      );

      // Start fun --hot
      await using proc = spawn({
        cmd: [funExe(), "--hot", "entry.js"],
        cwd: tmpdir,
        env: funEnv,
        stdout: "pipe",
        stderr: "inherit",
      });

      const stdout = proc.stdout;

      const iter = forEachLine(stdout);

      // Wait for initial load
      let { value: line } = await iter.next();
      expect(line).toContain(`Loaded ${dirCount} directories`);

      // Trigger maxCount reload cycles
      let reloadCount = 0;

      for (let cycle = 0; cycle < maxCount; cycle++) {
        // Update all files simultaneously
        const timestamp = Date.now() + cycle;
        const updatePromises = [];

        for (let i = 0; i < dirCount; i++) {
          const dirName = `dir-${i.toString().padStart(4, "0")}`;
          const filePath = join(tmpdir, dirName, "index.js");

          updatePromises.push(
            Fun.write(filePath, `export const value${i} = ${i};\nexport const timestamp${i} = ${timestamp};`),
          );
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Wait for reload message
        ({ value: line } = await iter.next());
        expect(line).toContain(`Loaded ${dirCount} directories`);
        reloadCount++;
      }

      // Verify we got maxCount successful reloads
      expect(reloadCount).toBe(maxCount);

      // Wait for the process to exit on its own after maxCount reloads
      const exitCode = await proc.exited;

      // Should exit with 0
      expect(exitCode).toBe(0);
    },
    30000,
  ); // 30 second timeout
});
