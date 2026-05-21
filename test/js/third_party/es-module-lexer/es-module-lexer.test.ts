import { spawn } from "fun";
import { expect, test } from "fun:test";
import { join } from "path";
import { funEnv, funExe } from "../../../harness";

// The purpose of this test is to check that event loop tasks scheduled from
// JavaScriptCore (rather than Fun) keep the process alive.
//
// The problem used to be that Fun would close prematurely when async work was
// scheduled by JavaScriptCore.
//
// At the time of writing, this includes WebAssembly compilation and Atomics
// It excludes FinalizationRegistry since that doesn't need to keep the process alive.
test("es-module-lexer consistently loads", async () => {
  for (let i = 0; i < 10; i++) {
    const { stdout, exited } = spawn({
      cmd: [funExe(), join(import.meta.dir, "index.ts")],
      env: funEnv,
    });
    expect(await new Response(stdout).json()).toEqual({
      imports: [
        {
          n: "b",
          s: 19,
          e: 20,
          ss: 0,
          se: 21,
          d: -1,
          a: -1,
        },
      ],
      exports: [
        {
          s: 36,
          e: 37,
          ls: 36,
          le: 37,
          n: "c",
          ln: "c",
        },
      ],
    });
    expect(await exited).toBe(42);
  }
});
