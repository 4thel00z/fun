import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("S3Client preserves queueSize instead of forcing it to 255", () => {
  expect(Fun.inspect(new Fun.S3Client({ queueSize: 10 }))).toContain("queueSize: 10");
  expect(Fun.inspect(new Fun.S3Client({ queueSize: 1 }))).toContain("queueSize: 1");
  expect(Fun.inspect(new Fun.S3Client({ queueSize: 255 }))).toContain("queueSize: 255");
});

test("S3Client does not crash with queueSize > 255", () => {
  const { exitCode, stdout } = Fun.spawnSync({
    cmd: [
      funExe(),
      "-e",
      `
        for (const n of [256, 1000, 2147483647]) {
          const c = new Fun.S3Client({ queueSize: n });
          if (!Fun.inspect(c).includes("queueSize: 255")) {
            throw new Error("queueSize " + n + " was not clamped to 255");
          }
        }
        console.log("ok");
      `,
    ],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(stdout.toString().trim()).toBe("ok");
  expect(exitCode).toBe(0);
});

test("S3Client throws RangeError with queueSize < 1", () => {
  expect(() => new Fun.S3Client({ queueSize: 0 })).toThrow(RangeError);
  expect(() => new Fun.S3Client({ queueSize: -1 })).toThrow(RangeError);
});
