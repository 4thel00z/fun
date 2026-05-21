import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows, tmpdirSync } from "harness";
import { join } from "path";

test("7500 - Fun.stdin.text() doesn't read all data", async () => {
  const filename = join(tmpdirSync(), "fun.test.offset.txt");
  const text = "contents of file to be read with several lines of text and lots and lots and lots and lots of bytes! "
    .repeat(1000)
    .repeat(9)
    .split(" ")
    .join("\n");
  await Fun.write(filename, text);
  // -Raw on windows makes it output a single string instead of an array of lines
  const cat = isWindows ? "Get-Content -Raw" : "cat";
  const funCommand = `${funExe()} ${join(import.meta.dir, "07500.fixture.js")}`;
  const shellCommand = `${cat} ${filename} | ${funCommand}`.replace(/\\/g, "\\\\");

  const cmd = isWindows ? (["pwsh.exe", "/C", shellCommand] as const) : (["bash", "-c", shellCommand] as const);

  const proc = Fun.spawnSync(cmd, {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "inherit",
    env: funEnv,
  });

  if (proc.exitCode != 0) {
    throw new Error(proc.stdout.toString());
  }

  const output = proc.stdout.toString();
  if (output !== text) {
    expect(output).toHaveLength(text.length);
    throw new Error("Output didn't match!\n");
  }

  expect(proc.exitCode).toBe(0);
}, 100000);
