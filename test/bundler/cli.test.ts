import { describe, expect, test } from "fun:test";
import { funEnv, funExe, isWindows, tempDir, tmpdirSync } from "harness";
import fs, { mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";

describe.concurrent(
  "fun build",
  () => {
    test("warnings dont return exit code 1", async () => {
      const { stderr, exited } = Fun.spawn({
        cmd: [funExe(), "build", path.join(import.meta.dir, "./fixtures/jsx-warning/index.jsx")],
        env: funEnv,
        stderr: "pipe",
      });
      expect(await exited).toBe(0);
      expect(await stderr.text()).toContain(
        'warn: "key" prop after a {...spread} is deprecated in JSX. Falling back to classic runtime.',
      );
    });

    test("generating a standalone binary in nested path, issue #4195", async () => {
      async function testCompile(outfile: string) {
        const { exited } = Fun.spawn({
          cmd: [
            funExe(),
            "build",
            path.join(import.meta.dir, "./fixtures/trivial/index.js"),
            "--compile",
            "--outfile",
            outfile,
          ],
          env: funEnv,
          stdout: "inherit",
          stderr: "inherit",
        });
        expect(await exited).toBe(0);
      }
      async function testExec(outfile: string) {
        const { exited, stderr } = Fun.spawn({
          cmd: [outfile],
          env: funEnv,
          stdout: "inherit",
          stderr: "pipe",
        });
        expect(await stderr.text()).toBeEmpty();
        expect(await exited).toBe(0);
      }
      const tmpdir = tmpdirSync();
      {
        const baseDir = `${tmpdir}/fun-build-outfile-${Date.now()}`;
        const outfile = path.join(baseDir, "index.exe");
        await testCompile(outfile);
        await testExec(outfile);
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
      {
        const baseDir = `${tmpdir}/fun-build-outfile2-${Date.now()}`;
        const outfile = path.join(baseDir, "b/u/n", "index.exe");
        await testCompile(outfile);
        await testExec(outfile);
        fs.rmSync(baseDir, { recursive: true, force: true });
      }
    });

    test("works with utf8 bom", async () => {
      const tmp = tmpdirSync();
      const src = path.join(tmp, "index.js");
      fs.writeFileSync(src, '\ufeffconsole.log("hello world");', { encoding: "utf8" });
      const { exited } = Fun.spawn({
        cmd: [funExe(), "build", src],
        env: funEnv,
        stdout: "inherit",
        stderr: "inherit",
      });
      expect(await exited).toBe(0);
    });

    test("--tsconfig-override works", async () => {
      const tmp = tmpdirSync();
      const baseDir = path.join(tmp, "tsconfig-override-test");
      fs.mkdirSync(baseDir, { recursive: true });

      fs.writeFileSync(
        path.join(baseDir, "index.ts"),
        `import { utils } from "@utils/helper";
console.log(utils());`,
      );

      fs.writeFileSync(path.join(baseDir, "helper.ts"), `export function utils() { return "Hello from utils"; }`);

      fs.writeFileSync(
        path.join(baseDir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            paths: {
              "@wrong/*": ["./wrong/*"],
            },
          },
        }),
      );

      fs.writeFileSync(
        path.join(baseDir, "custom-tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            paths: {
              "@utils/*": ["./*"],
            },
          },
        }),
      );

      const failResult = Fun.spawn({
        cmd: [funExe(), "build", path.join(baseDir, "index.ts"), "--outdir", path.join(baseDir, "out-fail")],
        env: funEnv,
        cwd: baseDir,
        stderr: "pipe",
      });
      expect(await failResult.exited).not.toBe(0);
      expect(await failResult.stderr?.text()).toContain("Could not resolve");

      const successResult = Fun.spawn({
        cmd: [
          funExe(),
          "build",
          path.join(baseDir, "index.ts"),
          "--tsconfig-override",
          path.join(baseDir, "custom-tsconfig.json"),
          "--outdir",
          path.join(baseDir, "out-success"),
        ],
        env: funEnv,
        cwd: baseDir,
        stderr: "pipe",
      });
      expect(await successResult.exited).toBe(0);

      const outputFile = path.join(baseDir, "out-success", "index.js");
      expect(fs.existsSync(outputFile)).toBe(true);
      const output = fs.readFileSync(outputFile, "utf8");
      expect(output).toContain("Hello from utils");
    });

    test("--tsconfig-override works from nested directories", async () => {
      const tmp = tmpdirSync();
      const baseDir = path.join(tmp, "tsconfig-nested-test");
      const nestedDir = path.join(baseDir, "nested", "deep");
      fs.mkdirSync(nestedDir, { recursive: true });

      fs.writeFileSync(
        path.join(nestedDir, "index.ts"),
        `import { utils } from "@utils/helper";
console.log(utils());`,
      );

      fs.writeFileSync(path.join(baseDir, "helper.ts"), `export function utils() { return "Hello from nested!"; }`);

      fs.writeFileSync(
        path.join(baseDir, "custom-tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            paths: {
              "@utils/*": ["./*"],
            },
          },
        }),
      );

      const result = Fun.spawn({
        cmd: [funExe(), "build", "index.ts", "--tsconfig-override", "../../custom-tsconfig.json", "--outdir", "out"],
        env: funEnv,
        cwd: nestedDir,
      });
      expect(await result.exited).toBe(0);

      const outputFile = path.join(nestedDir, "out", "index.js");
      expect(fs.existsSync(outputFile)).toBe(true);
      const output = fs.readFileSync(outputFile, "utf8");
      expect(output).toContain("Hello from nested!");
    });

    test("__dirname and __filename are printed correctly", async () => {
      using baseDirPath = tempDir("fun-build-dirname-filename", {
        "我": {
          "我.ts": "console.log(__dirname); console.log(__filename);",
        },
      });
      const baseDir = baseDirPath + "";

      const { exited } = Fun.spawn({
        cmd: [
          funExe(),
          "build",
          path.join(baseDir, "我/我.ts"),
          "--compile",
          "--outfile",
          path.join(baseDir, "exe.exe"),
        ],
        env: funEnv,
        cwd: baseDir,
        stdout: "inherit",
        stderr: "inherit",
      });
      expect(await exited).toBe(0);

      await using proc = Fun.spawn({
        cmd: [path.join(baseDir, "exe.exe")],
        env: funEnv,
        stdout: "pipe",
        stderr: "pipe",
      });
      const text = await proc.stdout.text();
      await proc.exited;

      expect(text).toContain(path.join(baseDir, "我") + "\n");
      expect(text).toContain(path.join(baseDir, "我", "我.ts") + "\n");
    });

    test.skipIf(!isWindows)("should be able to handle pretty path when using pnpm +  #14685", async () => {
      // this test code follows the same structure as and
      // is based on the code for testing issue 4893

      let testDir = tmpdirSync();

      // Clean up from prior runs if necessary
      rmSync(testDir, { recursive: true, force: true });

      // Create a directory with our test file
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        join(testDir, "index.ts"),
        "import chalk from \"chalk\"; export function main() { console.log(chalk.red('Hello, World!')); }",
      );
      writeFileSync(
        join(testDir, "package.json"),
        `
  {
  "dependencies": {
    "chalk": "^5.3.0"
  }
}`,
      );
      testDir = realpathSync(testDir);

      await Fun.spawn({
        cmd: [funExe(), "x", "pnpm@9", "i"],
        env: funEnv,
        stderr: "pipe",
        cwd: testDir,
      }).exited;
      // fun build --entrypoints ./index.ts --outdir ./dist --target node
      const { stderr, exited } = Fun.spawn({
        cmd: [
          funExe(),
          "build",
          "--entrypoints",
          join(testDir, "index.ts"),
          "--outdir",
          join(testDir, "dist"),
          "--target",
          "node",
        ],
        env: funEnv,
        stderr: "pipe",
        stdout: "pipe",
      });
      expect(await stderr.text()).toBe("");
      expect(await exited).toBe(0);
    });
  },
  10_000,
);

test.skipIf(!isWindows)("should be able to handle pretty path on windows #13897", async () => {
  // this test code follows the same structure as and
  // is based on the code for testing issue 4893

  let testDir = tmpdirSync();

  // Clean up from prior runs if necessary
  rmSync(testDir, { recursive: true, force: true });

  // Create a directory with our test file
  mkdirSync(testDir, { recursive: true });

  writeFileSync(
    join(testDir, "index.ts"),
    "import chalk from \"chalk\"; export function main() { console.log(chalk.red('Hello, World!')); }",
  );

  writeFileSync(join(testDir, "chalk.ts"), "function red(value){ consol.error(value); } export default { red };");
  testDir = realpathSync(testDir);

  // fun build --entrypoints ./index.ts --outdir ./dist --target node
  const buildOut = await Fun.build({
    entrypoints: [join(testDir, "index.ts")],
    outdir: join(testDir, "dist"),
    minify: true,
    sourcemap: "linked",
    plugins: [
      {
        name: "My windows plugin",
        async setup(build) {
          build.onResolve({ filter: /chalk/ }, () => ({ path: join(testDir, "chalk.ts").replaceAll("/", "\\") }));
        },
      },
    ],
  });
  expect(buildOut?.success).toBe(true);
});

test("you can use --outfile=... and --sourcemap", async () => {
  const tmpdir = tmpdirSync();
  const inputFile = path.join(tmpdir, "input.js");
  const outFile = path.join(tmpdir, "out.js");

  writeFileSync(inputFile, 'console.log("Hello, world!");');

  const originalContent = fs.readFileSync(inputFile, "utf8");

  const { exited, stdout } = Fun.spawn({
    cmd: [funExe(), "build", "--outfile=" + path.relative(tmpdir, outFile), "--sourcemap", inputFile],
    env: funEnv,
    cwd: tmpdir,
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await exited).toBe(0);

  // Verify that the input file wasn't overwritten
  expect(fs.readFileSync(inputFile, "utf8")).toBe(originalContent);

  // Verify that the output file was created
  expect(fs.existsSync(outFile)).toBe(true);

  // Verify that the sourcemap file was created
  expect(fs.existsSync(outFile + ".map")).toBe(true);

  // Verify that the output file contains sourceMappingURL comment
  const outputContent = fs.readFileSync(outFile, "utf8");
  expect(outputContent).toContain("//# sourceMappingURL=out.js.map");

  expect((await stdout.text()).replace(/\d{1,}ms/, "0.000000001ms")).toMatchInlineSnapshot(`
    "Bundled 1 module in 0.000000001ms

      out.js      120 bytes  (entry point)
      out.js.map  213 bytes  (source map)

    "
  `);
});

test("some log cases", async () => {
  const tmpdir = tmpdirSync();
  const inputFile = path.join(tmpdir, "input.js");
  const outFile = path.join(tmpdir, "out.js");

  writeFileSync(inputFile, 'console.log("Hello, world!");');

  // absolute path
  const { exited, stdout } = Fun.spawn({
    cmd: [funExe(), "build", "--outfile=" + outFile, "--sourcemap", inputFile],
    env: funEnv,
    cwd: tmpdir,
  });
  expect(await exited).toBe(0);
  expect((await stdout.text()).replace(/in \d+ms/g, "in {time}ms")).toMatchInlineSnapshot(`
    "Bundled 1 module in {time}ms

      out.js      120 bytes  (entry point)
      out.js.map  213 bytes  (source map)

    "
  `);
});

test("log case 1", async () => {
  const tmpdir = tmpdirSync();
  const inputFile = path.join(tmpdir, "input.js");
  const inputFile2 = path.join(tmpdir, "input-twooo.js");

  writeFileSync(inputFile, 'console.log("Hello, world!");');
  writeFileSync(inputFile2, 'console.log("Hello, world!");');

  const { exited, stdout } = Fun.spawn({
    cmd: [funExe(), "build", "--outdir=" + tmpdir + "/out", inputFile, inputFile2],
    env: funEnv,
    cwd: tmpdir,
  });
  expect(await exited).toBe(0);
  expect((await stdout.text()).replace(/in \d+ms/g, "in {time}ms")).toMatchInlineSnapshot(`
    "Bundled 2 modules in {time}ms

      input.js        42 bytes  (entry point)
      input-twooo.js  48 bytes  (entry point)

    "
  `);
});

test("log case 2", async () => {
  const tmpdir = tmpdirSync();
  const inputFile = path.join(tmpdir, "input.js");

  writeFileSync(inputFile, 'console.log("Hello, world!");');

  const { exited, stdout } = Fun.spawn({
    cmd: [funExe(), "build", "--outdir=" + tmpdir + "/out", inputFile],
    env: funEnv,
    cwd: tmpdir,
  });
  expect(await exited).toBe(0);
  expect((await stdout.text()).replace(/in \d+ms/g, "in {time}ms")).toMatchInlineSnapshot(`
    "Bundled 1 module in {time}ms

      input.js  42 bytes  (entry point)

    "
  `);
});
