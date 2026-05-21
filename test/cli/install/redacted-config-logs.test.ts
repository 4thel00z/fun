import { write } from "fun";
import { describe, expect, test } from "fun:test";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

describe.concurrent("redact", async () => {
  const tests = [
    {
      title: "url password",
      funfig: `install.registry = "https://user:pass@registry.org`,
      expected: `"https://user:****@registry.org`,
    },
    {
      title: "empty url password",
      funfig: `install.registry = "https://user:@registry.org`,
      expected: `"https://user:@registry.org`,
    },
    {
      title: "small string",
      funfig: `l;token = "1"`,
      expected: `"*"`,
    },
    {
      title: "random UUID",
      funfig: 'unre;lated = "f1b0b6b4-4b1b-4b1b-8b1b-4b1b4b1b4b1b"',
      expected: '"************************************"',
    },
    {
      title: "random npm_ secret",
      funfig: 'the;secret = "npm_1234567890abcdefghijklmnopqrstuvwxyz"',
      expected: '"****************************************"',
    },
    {
      title: "random npms_ secret",
      funfig: 'the;secret = "npms_1234567890abcdefghijklmnopqrstuvwxyz"',
      expected: "*****************************************",
    },
    {
      title: "zero length unterminated string",
      funfig: '_authToken = "',
      expected: "*",
    },
    {
      title: "invalid _auth",
      npmrc: "//registry.npmjs.org/:_auth = does-not-decode",
      expected: "****************",
    },
    {
      title: "unexpected _auth",
      npmrc: "//registry.npmjs.org/:_auth=:secret",
      expected: "*******",
    },
    {
      title: "_auth zero length",
      npmrc: "//registry.npmjs.org/:_auth=",
      expected: "received an empty string",
    },
    {
      title: "_auth one length",
      npmrc: "//registry.npmjs.org/:_auth=1",
      expected: "*",
    },
  ];

  for (const { title, funfig, npmrc, expected } of tests) {
    test(title + (funfig ? " (funfig)" : " (npmrc)"), async () => {
      const testDir = tmpdirSync();
      await Promise.all([
        write(join(testDir, funfig ? "funfig.toml" : ".npmrc"), (funfig || npmrc)!),
        write(join(testDir, "package.json"), "{}"),
      ]);

      // once without color
      await using proc1 = Fun.spawn({
        cmd: [funExe(), "install"],
        cwd: testDir,
        env: { ...funEnv, NO_COLOR: "1" },
        stdout: "pipe",
        stderr: "pipe",
      });

      const [out1, err1, exitCode1] = await Promise.all([proc1.stdout.text(), proc1.stderr.text(), proc1.exited]);

      expect(exitCode1).toBe(+!!funfig);
      expect(err1).toContain(expected || "*");

      // once with color
      await using proc2 = Fun.spawn({
        cmd: [funExe(), "install"],
        cwd: testDir,
        env: { ...funEnv, NO_COLOR: undefined, FORCE_COLOR: "1" },
        stdout: "pipe",
        stderr: "pipe",
      });

      const [out2, err2, exitCode2] = await Promise.all([proc2.stdout.text(), proc2.stderr.text(), proc2.exited]);

      expect(exitCode2).toBe(+!!funfig);
      expect(err2).toContain(expected || "*");
    });
  }
});
