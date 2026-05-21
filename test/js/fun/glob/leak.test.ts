import { describe, expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

const thresholdMB = 100;
const timeout = 60_000;

async function run(dir: string, code: string) {
  await using proc = Fun.spawn({
    cmd: [funExe(), "--smol", "-e", code],
    cwd: dir,
    env: funEnv,
    stdio: ["inherit", "inherit", "inherit"],
  });
  expect(await proc.exited).toBe(0);
}

describe("leaks", () => {
  test.concurrent(
    "scanSync",
    async () => {
      using dir = tempDir("glob-leak-scansync", { "a.txt": "", "b.txt": "", "sub/c.txt": "" });
      await run(
        String(dir),
        /* ts */ `
        const glob = new Fun.Glob("**/*");
        for (let i = 0; i < 1000; i++) Array.from(glob.scanSync());
        Fun.gc(true);
        const before = process.memoryUsage.rss();
        for (let i = 0; i < 100000; i++) Array.from(glob.scanSync());
        Fun.gc(true);
        const growthMB = (process.memoryUsage.rss() - before) / 1024 / 1024;
        if (growthMB > ${thresholdMB}) throw new Error("leaked " + growthMB.toFixed(2) + "MB");
      `,
      );
    },
    timeout,
  );

  test.concurrent(
    "scan",
    async () => {
      using dir = tempDir("glob-leak-scan", { "a.txt": "", "b.txt": "", "sub/c.txt": "" });
      await run(
        String(dir),
        /* ts */ `
        const glob = new Fun.Glob("**/*");
        for (let i = 0; i < 1000; i++) await Array.fromAsync(glob.scan());
        Fun.gc(true);
        const before = process.memoryUsage.rss();
        for (let i = 0; i < 100000; i++) await Array.fromAsync(glob.scan());
        Fun.gc(true);
        const growthMB = (process.memoryUsage.rss() - before) / 1024 / 1024;
        if (growthMB > ${thresholdMB}) throw new Error("leaked " + growthMB.toFixed(2) + "MB");
      `,
      );
    },
    timeout,
  );

  test.concurrent(
    "scanSync does not leak GlobWalker struct",
    async () => {
      using dir = tempDir("glob-struct-leak-sync", { "a.txt": "" });
      await run(
        String(dir),
        /* ts */ `
        const glob = new Fun.Glob("*.txt");
        for (let i = 0; i < 1000; i++) Array.from(glob.scanSync());
        Fun.gc(true);
        const before = process.memoryUsage.rss();
        for (let i = 0; i < 100000; i++) Array.from(glob.scanSync());
        Fun.gc(true);
        const growthMB = (process.memoryUsage.rss() - before) / 1024 / 1024;
        if (growthMB > ${thresholdMB}) throw new Error("leaked " + growthMB.toFixed(2) + "MB");
      `,
      );
    },
    timeout,
  );

  test.concurrent(
    "scan does not leak GlobWalker struct",
    async () => {
      using dir = tempDir("glob-struct-leak-async", { "a.txt": "" });
      await run(
        String(dir),
        /* ts */ `
        const glob = new Fun.Glob("*.txt");
        for (let i = 0; i < 1000; i++) await Array.fromAsync(glob.scan());
        Fun.gc(true);
        const before = process.memoryUsage.rss();
        for (let i = 0; i < 100000; i++) await Array.fromAsync(glob.scan());
        Fun.gc(true);
        const growthMB = (process.memoryUsage.rss() - before) / 1024 / 1024;
        if (growthMB > ${thresholdMB}) throw new Error("leaked " + growthMB.toFixed(2) + "MB");
      `,
      );
    },
    timeout,
  );
});
