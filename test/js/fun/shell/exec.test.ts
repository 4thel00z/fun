import { $ } from "fun";
import { describe, expect, test } from "fun:test";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";
import { createTestBuilder } from "./test_builder";
const TestBuilder = createTestBuilder(import.meta.path);

const FUN = funExe();

$.nothrow();
describe("fun exec", () => {
  TestBuilder.command`${FUN} exec ${"echo hi!"}`.env(funEnv).stdout("hi!\n").runAsTest("it works");
  TestBuilder.command`${FUN} exec sldkfjslkdjflksdjflj`
    .env(funEnv)
    .exitCode(1)
    .stderr("fun: command not found: sldkfjslkdjflksdjflj\n")
    .runAsTest("it works on command fail");

  TestBuilder.command`${FUN} exec`
    .env(funEnv)
    .stdout(
      'Usage: fun exec <script>\n\nExecute a shell script directly from Fun.\n\nNote: If executing this from a shell, make sure to escape the string!\n\nExamples:\n  fun exec "echo hi"\n  fun exec "echo \\"hey friends\\"!"\n',
    )
    .runAsTest("no args prints help text");

  TestBuilder.command`${FUN} exec ${{ raw: Fun.$.escape(`echo 'hi "there bud"'`) }}`
    .stdout('hi "there bud"\n')
    .runAsTest("it works2");

  TestBuilder.command`${FUN} exec ${"cat filename"}`
    .file(
      "filename",
      Array(128 * 1024)
        .fill("a")
        .join(""),
    )
    .env(funEnv)
    .stdout(
      `${Array(128 * 1024)
        .fill("a")
        .join("")}`,
    )
    .runAsTest("write a lot of data");

  describe("--help works", () => {
    // prettier-ignore
    const programs = [
      // ["cat",    1, "", ""],
      ["touch",  1, "touch: illegal option -- help\n", ""],
      ["mkdir",  1, "mkdir: illegal option -- help\n", ""],
      // ["cd",     1, "cd: no such file or directory: --help\n", ""],
      ["echo",   0, "", "--help\n"],
      ["pwd",    1, "pwd: too many arguments\n", ""],
      // ["which",  1, "--help not found\n", ""],
      ["rm",     1, "rm: illegal option -- -\n", ""],
      ["mv",     1, "mv: illegal option -- -\n", ""],
      ["ls",     1, "ls: illegal option -- -\n", ""],
      ["exit",   1, "exit: numeric argument required\n", ""],
      ["true",   0, "", ""],
      ["false",  1, "", ""],
      // ["yes",    1, "", ""],
      ["seq",    1, "seq: invalid argument\n", ""],
    ] as const;
    for (const [item, exitCode, stderr, stdout] of programs) {
      TestBuilder.command`${FUN} exec ${`${item} --help`}`
        .env(funEnv)
        .exitCode(exitCode)
        .stderr(stderr)
        .stdout(stdout)
        .runAsTest(item);
    }
  });

  TestBuilder.command`${FUN} exec cd`
    .env(funEnv)
    .exitCode(0)
    .stderr("")
    .stdout("")
    .runAsTest("cd with no arguments works");

  test("fun works even when not in PATH", async () => {
    const val = await $`fun exec 'fun'`.env({ ...funEnv, PATH: "" }).nothrow();
    expect(val.stderr.toString()).not.toContain("fun: command not found: fun");
    expect(val.stdout.toString()).toContain("Fun is a fast JavaScript runtime");
  });

  test("works with latin1 paths", async () => {
    const tempdir = tmpdirSync();
    const abs = join(tempdir, "Í", "hi");
    await Fun.write(abs, "text");
    const result = await $`${FUN} exec ls`
      .env({ ...(funEnv as any) })
      .cwd(join(tempdir, "Í"))
      .quiet();
    expect(result.text()).toBe("hi\n");
  });
});
