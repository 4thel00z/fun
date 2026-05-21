import { SyncSubprocess } from "fun";
import { describe, expect, test } from "fun:test";
import { rmSync, writeFileSync } from "fs";
import { funEnv, funExe, isWindows, tmpdirSync } from "harness";
import { tmpdir } from "os";
import { join, sep } from "path";

for (const flag of ["-e", "--print"]) {
  describe(`fun ${flag}`, () => {
    test("it works", async () => {
      const input = flag === "--print" ? '"hello world"' : 'console.log("hello world")';
      let { stdout } = Fun.spawnSync({
        cmd: [funExe(), flag, input],
        env: funEnv,
      });
      expect(stdout.toString("utf8")).toEqual("hello world\n");
    });

    test("import, tsx, require in esm, import.meta", async () => {
      const ref = await import("react");
      const input =
        flag === "--print"
          ? 'import {version} from "react"; console.log(JSON.stringify({version,file:import.meta.path,require:require("react").version})); <hello>world</hello>'
          : 'import {version} from "react"; console.log(JSON.stringify({version,file:import.meta.path,require:require("react").version})); console.log(<hello>world</hello>);';

      let { stdout } = Fun.spawnSync({
        cmd: [funExe(), flag, input],
        env: funEnv,
      });
      const json = {
        version: ref.version,
        file: join(process.cwd(), "[eval]"),
        require: ref.version,
      };
      expect(stdout.toString("utf8")).toEqual(JSON.stringify(json) + "\n<hello>world</hello>\n");
    });

    test("error has source map info 1", async () => {
      let { stderr } = Fun.spawnSync({
        cmd: [funExe(), flag, '(throw new Error("hi" as 2))'],
        env: funEnv,
      });
      expect(stderr.toString("utf8")).toInclude('"hi" as 2');
      expect(stderr.toString("utf8")).toInclude("Unexpected throw");
    });

    test("process.argv", async () => {
      function testProcessArgv(args: string[], expected: string[]) {
        const input = flag === "--print" ? "process.argv" : "console.log(process.argv)";
        let { stdout, stderr, exitCode } = Fun.spawnSync({
          cmd: [funExe(), flag, input, ...args],
          env: funEnv,
        });

        expect(stderr.toString("utf8")).toBe("");
        expect(JSON.parse(stdout.toString("utf8"))).toEqual(expected);
        expect(exitCode).toBe(0);
      }

      // replace the trailin
      const exe = isWindows ? funExe().replaceAll("/", "\\") : funExe();
      testProcessArgv([], [exe]);
      testProcessArgv(["abc", "def"], [exe, "abc", "def"]);
      testProcessArgv(["--", "abc", "def"], [exe, "abc", "def"]);
      // testProcessArgv(["--", "abc", "--", "def"], [exe, "abc", "--", "def"]);
    });

    test("process._eval", async () => {
      const code = flag === "--print" ? "process._eval" : "console.log(process._eval)";
      const { stdout } = Fun.spawnSync({
        cmd: [funExe(), flag, code],
        env: funEnv,
      });
      expect(stdout.toString("utf8")).toEqual(code + "\n");
    });

    test("does not crash in non-latin1 directory", async () => {
      const dir = join(tmpdirSync(), "eval-test-开始学习");
      await Fun.write(join(dir, "index.js"), "console.log('hello world')");

      const { stdout, stderr, exitCode } = Fun.spawnSync({
        cmd: [funExe(), flag, "import './index.js'"],
        env: funEnv,
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
      });

      expect(stderr.toString("utf8")).toBe("");
      expect(stdout.toString("utf8")).toEqual("hello world\n" + (flag === "--print" ? "undefined\n" : ""));
      expect(exitCode).toBe(0);
    });
  });
}

describe("--print for cjs/esm", () => {
  test("eval result between esm imports", async () => {
    let cwd = tmpdirSync();
    writeFileSync(join(cwd, "foo.js"), "'foo'");
    writeFileSync(join(cwd, "bar.js"), "'bar'");
    let { stdout, stderr, exitCode } = Fun.spawnSync({
      cmd: [funExe(), "--print", 'import "./foo.js"; 123; import "./bar.js"'],
      cwd: cwd,
      env: funEnv,
    });
    expect(stderr.toString("utf8")).toBe("");
    expect(stdout.toString("utf8")).toEqual("123\n");
    expect(exitCode).toBe(0);
    rmSync(cwd, { recursive: true, force: true });
  });
  // https://github.com/underdoc-org/fun/issues/30207
  describe.each([
    { expr: "(await 1) + 1", expected: "2" },
    { expr: 'await Promise.resolve("hello") + " world"', expected: "hello world" },
    { expr: "(await 1) + (await 2)", expected: "3" },
    // no top-level await — still returns the expression value.
    { expr: "1 + 1", expected: "2" },
  ])("fun -p $expr", ({ expr, expected }) => {
    test(`→ ${expected}`, async () => {
      const { stdout, stderr, exitCode } = Fun.spawnSync({
        cmd: [funExe(), "-p", expr],
        env: funEnv,
      });
      expect(stderr.toString("utf8")).toBe("");
      expect(stdout.toString("utf8")).toBe(`${expected}\n`);
      expect(exitCode).toBe(0);
    });
  });
  test("forced cjs", async () => {
    let { stdout, stderr, exitCode } = Fun.spawnSync({
      cmd: [funExe(), "--print", "module.exports; 123"],
      env: funEnv,
    });
    expect(stderr.toString("utf8")).toBe("");
    expect(stdout.toString("utf8")).toEqual("123\n");
    expect(exitCode).toBe(0);
  });
  test("module, exports, require, __filename, __dirname", async () => {
    let { stdout, stderr, exitCode } = Fun.spawnSync({
      cmd: [
        funExe(),
        "--print",
        `
        console.log(typeof module, typeof exports, typeof require, typeof __filename, typeof __dirname); 123
      `,
      ],
      env: funEnv,
    });
    expect(stderr.toString("utf8")).toBe("");
    expect(stdout.toString("utf8")).toEqual("object object function string string\n123\n");
    expect(exitCode).toBe(0);
  });
  test("module._compile is require('module').prototype._compile", async () => {
    const { stdout, exitCode } = Fun.spawnSync({
      cmd: [funExe(), "-p", "module._compile === require('module').prototype._compile"],
      env: funEnv,
    });
    expect(stdout.toString()).toBe("true\n");
    expect(exitCode).toBe(0);
  });
});

function group(run: (code: string) => SyncSubprocess<"pipe", "inherit">) {
  test("it works", async () => {
    const { stdout } = run('console.log("hello world")');
    expect(stdout.toString("utf8")).toEqual("hello world\n");
  });

  test("it gets a correct specifer", async () => {
    const { stdout } = run("console.log(import.meta.path)");
    expect(stdout.toString("utf8")).toEndWith(sep + "[stdin]\n");
  });

  test("it can require", async () => {
    const { stdout } = run(`
        const process = require("node:process");
        console.log(process.platform);
      `);
    expect(stdout.toString("utf8")).toEqual(process.platform + "\n");
  });

  test("it can import", async () => {
    const { stdout } = run(`
        import * as process from "node:process";
        console.log(process.platform);
      `);
    expect(stdout.toString("utf8")).toEqual(process.platform + "\n");
  });

  test("process.argv", async () => {
    const { stdout } = run("console.log(process.argv)");
    const exe = isWindows ? funExe().replaceAll("/", "\\") : funExe();
    expect(JSON.parse(stdout.toString("utf8"))).toEqual([exe, "-"]);
  });

  test("process._eval", async () => {
    const code = "console.log(process._eval)";
    const { stdout } = run(code);

    // the file piping one on windows can include extra carriage returns
    if (isWindows) {
      expect(stdout.toString("utf8")).toInclude(code);
    } else {
      expect(stdout.toString("utf8")).toEqual(code + "\n");
    }
  });
}

describe("fun run - < file-path.js", () => {
  function run(code: string) {
    // bash only supports / as path separator
    const file = join(tmpdir(), "fun-run-eval-test.js").replaceAll("\\", "/");
    require("fs").writeFileSync(file, code);
    try {
      let result;
      if (process.platform === "win32") {
        result = Fun.spawnSync(["powershell", "-c", `Get-Content ${file} | ${funExe()} run -`], {
          env: funEnv,
          stderr: "inherit",
        });
      } else {
        result = Fun.spawnSync(["bash", "-c", `${funExe()} run - < ${file}`], {
          env: funEnv,
          stderr: "inherit",
        });
      }

      if (!result.success) {
        queueMicrotask(() => {
          throw new Error("fun run - < file-path.js failed");
        });
      }

      return result;
    } finally {
      try {
        require("fs").unlinkSync(file);
      } catch (e) {}
    }
  }

  group(run);
});

describe("echo | fun run -", () => {
  function run(code: string) {
    const result = Fun.spawnSync([funExe(), "run", "-"], {
      env: funEnv,
      stdin: Buffer.from(code),
      stderr: "inherit",
    });
    if (!result.success) {
      queueMicrotask(() => {
        throw new Error("fun run - failed");
      });
    }

    return result;
  }

  group(run);
});

test("process._eval (undefined for normal run)", async () => {
  const cwd = tmpdirSync();
  const file = join(cwd, "test.js");
  writeFileSync(file, "console.log(typeof process._eval)");

  const { stdout } = Fun.spawnSync({
    cmd: [funExe(), "run", file],
    cwd: cwd,
    env: funEnv,
  });
  expect(stdout.toString("utf8")).toEqual("undefined\n");

  rmSync(cwd, { recursive: true, force: true });
});
