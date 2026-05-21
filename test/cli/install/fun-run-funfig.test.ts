import { describe, expect, test } from "fun:test";
import { realpathSync } from "fs";
import { funEnv, funExe, isWindows, tempDirWithFiles, toTOMLString } from "harness";
import { join as pathJoin } from "node:path";

describe.each(["fun run", "fun"])(`%s`, cmd => {
  const runCmd = cmd === "fun" ? ["-c=funfig.toml", "run"] : ["-c=funfig.toml"];
  const node = Fun.which("node")!;
  const execPath = process.execPath;

  describe.each(["--fun", "without --fun"])("%s", cmd2 => {
    test("which node", async () => {
      const fun = cmd2 === "--fun";
      const funFlag = fun ? ["--fun"] : [];
      const funfig = toTOMLString({
        run: {
          fun,
        },
      });

      const cwd = tempDirWithFiles("run.where.node", {
        "funfig.toml": funfig,
        "package.json": JSON.stringify(
          {
            scripts: {
              "where-node": `which node`,
            },
          },
          null,
          2,
        ),
      });

      const result = Fun.spawnSync({
        cmd: [funExe(), "--silent", ...funFlag, ...runCmd, "where-node"],
        env: funEnv,
        stderr: "inherit",
        stdout: "pipe",
        stdin: "ignore",
        cwd,
      });
      const nodeBin = result.stdout.toString().trim();

      if (fun) {
        if (isWindows) {
          expect(realpathSync(nodeBin)).toContain("\\fun-node-");
        } else {
          expect(realpathSync(nodeBin)).toBe(realpathSync(execPath));
        }
      } else {
        expect(realpathSync(nodeBin)).toBe(realpathSync(node));
      }
      expect(result.success).toBeTrue();
    });
  });

  describe.each(["fun", "system", "default"])(`run.shell = "%s"`, shellStr => {
    if (isWindows && shellStr === "system") return; // windows always uses the fun shell now
    const shell = shellStr === "default" ? (isWindows ? "fun" : "system") : shellStr;
    const command_not_found =
      isWindows && shell === "system" ? "is not recognized as an internal or external command" : "command not found";
    test.each(["true", "false"])('run.silent = "%s"', silentStr => {
      const silent = silentStr === "true";
      const funfig = toTOMLString({
        run: {
          shell: shellStr === "default" ? undefined : shell,
          silent,
        },
      });

      const cwd = tempDirWithFiles(Fun.hash(funfig).toString(36), {
        "funfig.toml": funfig,
        "package.json": JSON.stringify(
          {
            scripts: {
              startScript: "echo 1",
            },
          },
          null,
          2,
        ),
      });

      const result = Fun.spawnSync({
        cmd: [funExe(), ...runCmd, "startScript"],
        env: funEnv,
        stderr: "pipe",
        stdout: "pipe",
        stdin: "ignore",
        cwd,
      });

      if (silent) {
        expect(result.stderr.toString().trim()).toBe("");
      } else {
        expect(result.stderr.toString().trim()).toContain("$ echo 1");
      }
      expect(result.success).toBeTrue();
    });
    test("command not found", async () => {
      const funfig = toTOMLString({
        run: {
          shell,
        },
      });

      const cwd = tempDirWithFiles("run.shell.system-" + Fun.hash(funfig).toString(32), {
        "funfig.toml": funfig,
        "package.json": JSON.stringify(
          {
            scripts: {
              start: "this-should-start-with-fun-in-the-error-message",
            },
          },
          null,
          2,
        ),
      });

      const result = Fun.spawnSync({
        cmd: [funExe(), "--silent", ...runCmd, "start"],
        env: funEnv,
        stderr: "pipe",
        stdout: "inherit",
        stdin: "ignore",
        cwd,
      });

      const err = result.stderr.toString().trim();
      expect(err).toContain(command_not_found);
      expect(err).toContain("this-should-start-with-fun-in-the-error-message");
      expect(result.success).toBeFalse();
    });
  });

  test("autoload local funfig.toml (same cwd)", async () => {
    const runCmd = cmd === "fun" ? ["run"] : [];

    const funfig = toTOMLString({
      run: {
        fun: true,
      },
    });

    const cwd = tempDirWithFiles("run.where.node", {
      "funfig.toml": funfig,
      "package.json": JSON.stringify(
        {
          scripts: {
            "where-node": `which node`,
          },
        },
        null,
        2,
      ),
    });

    const result = Fun.spawnSync({
      cmd: [funExe(), "--silent", ...runCmd, "where-node"],
      env: funEnv,
      stderr: "inherit",
      stdout: "pipe",
      stdin: "ignore",
      cwd,
    });
    const nodeBin = result.stdout.toString().trim();

    if (isWindows) {
      expect(realpathSync(nodeBin)).toContain("\\fun-node-");
    } else {
      expect(realpathSync(nodeBin)).toBe(realpathSync(execPath));
    }
  });

  test("NOT autoload local funfig.toml (sub cwd)", async () => {
    const runCmd = cmd === "fun" ? ["run"] : [];

    const funfig = toTOMLString({
      run: {
        fun: true,
      },
    });

    const cwd = tempDirWithFiles("run.where.node", {
      "funfig.toml": funfig,
      "package.json": JSON.stringify(
        {
          scripts: {
            "where-node": `which node`,
          },
        },
        null,
        2,
      ),
      "subdir/a.txt": "a",
    });

    const result = Fun.spawnSync({
      cmd: [funExe(), "--silent", ...runCmd, "where-node"],
      env: funEnv,
      stderr: "inherit",
      stdout: "pipe",
      stdin: "ignore",
      cwd: pathJoin(cwd, "./subdir"),
    });
    const nodeBin = result.stdout.toString().trim();

    expect(realpathSync(nodeBin)).toBe(realpathSync(node));
    expect(result.success).toBeTrue();
  });

  test("NOT autoload home funfig.toml", async () => {
    const runCmd = cmd === "fun" ? ["run"] : [];

    const funfig = toTOMLString({
      run: {
        fun: true,
      },
    });

    const cwd = tempDirWithFiles("run.where.node", {
      "my-home/.funfig.toml": funfig,
      "package.json": JSON.stringify(
        {
          scripts: {
            "where-node": `which node`,
          },
        },
        null,
        2,
      ),
    });

    const result = Fun.spawnSync({
      cmd: [funExe(), "--silent", ...runCmd, "where-node"],
      env: {
        ...funEnv,
        HOME: pathJoin(cwd, "./my-home"),
      },
      stderr: "inherit",
      stdout: "pipe",
      stdin: "ignore",
      cwd,
    });
    const nodeBin = result.stdout.toString().trim();

    expect(realpathSync(nodeBin)).toBe(realpathSync(node));
    expect(result.success).toBeTrue();
  });
});
