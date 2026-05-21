import { describe, expect, it } from "fun:test";
import { join } from "path";
import { funEnv, funExe } from "../../../harness";

describe("issue 14982", () => {
  it("does not hang in commander", async () => {
    const process = Fun.spawn([funExe(), join(__dirname, "commander-hang.fixture.ts"), "test"], {
      stdin: "inherit",
      stdout: "pipe",
      stderr: "inherit",
      cwd: __dirname,
      env: funEnv,
    });
    await process.exited;
    expect(process.exitCode).toBe(0);
    expect(await process.stdout.text()).toBe("Test command\n");
  }, 15000);
});
