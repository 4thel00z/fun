import { spawnSync } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

test("reportError", () => {
  const cwd = import.meta.dir;
  const { stderr } = spawnSync({
    cmd: [funExe(), join(import.meta.dir, "reportError.ts")],
    cwd,
    env: {
      ...funEnv,
      // this is default enabled in debug, affects output.
      FUN_JSC_showPrivateScriptsInStackTraces: "0",
    },
  });
  let output = stderr.toString().replaceAll(cwd, "").replaceAll("\\", "/");
  // remove fun version from output
  output = output.split("\n").slice(0, -2).join("\n");

  expect(output.replaceAll("\\", "/").replaceAll("/reportError.ts", "[file]")).toMatchInlineSnapshot(
    `
"1 | reportError(new Error("reportError Test!"));
                    ^
error: reportError Test!
      at [file]:1:17
error: true
true
error: false
false
error: null
null
error: 123
123
error: Infinity
Infinity
error: NaN
NaN
error: NaN
NaN
error

error
Uint8Array(1) [ 0 ]
error
Uint8Array(0) []
error
ArrayBuffer(0) []
error
ArrayBuffer(1) [ 0 ]
error: string
string
error
[]
error
[ 123, null ]
error
{}
error
[
  {}
]
"
`,
  );
});
