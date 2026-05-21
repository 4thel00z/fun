import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("expect does not crash when value has Symbol.toPrimitive returning a Symbol", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      const obj = /foo/;
      obj[Symbol.toPrimitive] = Symbol;
      try { Fun.jest().expect(obj).toBeFalse(); } catch {}
    `,
    ],
    env: funEnv,
  });

  const exitCode = await proc.exited;

  expect(exitCode).toBe(0);
});
