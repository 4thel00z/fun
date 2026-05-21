import { spawn } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe, withoutAggressiveGC } from "harness";
import { join } from "path";

const arg0 = process.argv[0];
const arg1 = join(import.meta.dir, "print-process-args.js");

async function run(args, isRun) {
  const exe = funExe();

  const { stdout } = spawn([exe, ...(isRun ? ["run"] : []), arg1, ...args], {
    cwd: import.meta.dir,
    stderr: "inherit",
    stdin: "ignore",
    env: funEnv,
  });
  return await new Response(stdout).json();
}
test("args exclude run", async () => {
  const fixture = [["-"], ["a"], ["a", "b"], ["a", "b", "c"], []];

  for (let i = 0; i < 10; i++) {
    const withRun = fixture.map(args => run(args, true));
    const withoutRun = fixture.map(args => run(args, false));

    const all = await Promise.all([...withRun, ...withoutRun]);
    withoutAggressiveGC(() => {
      for (let i = 0; i < fixture.length; i++) {
        expect(all[i]).toEqual([arg0, arg1, ...fixture[i]]);
      }
    });
    console.count("Run");
  }
});
