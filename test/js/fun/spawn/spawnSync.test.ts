import { describe, expect, it } from "fun:test";
import { funEnv, funExe, isPosix } from "harness";
import { join } from "path";
describe("spawnSync", () => {
  it("should throw a RangeError if timeout is less than 0", () => {
    expect(() =>
      Fun.spawnSync({
        cmd: [funExe()],
        env: funEnv,
        timeout: -1,
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"The value of "timeout" is out of range. It must be >= 0 and <= 9007199254740991. Received -1"`,
    );
  });

  for (const ioOption of ["ignore", "pipe", "inherit"]) {
    it(`should not set a timeout if timeout is 0 and ${ioOption} is used for stdout`, () => {
      const start = performance.now();
      const result = Fun.spawnSync({
        cmd: [funExe(), "-e", "setTimeout(() => {}, 5)"],
        env: funEnv,
        stdin: "ignore",
        stdout: ioOption,
        stderr: ioOption,
        timeout: 0,
        maxBuffer: 0,
      });
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
      expect(!!result.exitedDueToTimeout).toBe(false);
      expect(result.exitCode).toBe(0);
    });
  }

  it.skipIf(process.platform !== "linux")("should use memfd when possible", () => {
    expect([join(import.meta.dir, "spawnSync-memfd-fixture.ts")]).toRun();
  });

  it.skipIf(!isPosix)("should use spawnSync optimizations when possible", () => {
    expect([join(import.meta.dir, "spawnSync-counters-fixture.ts")]).toRun();
  });
});
