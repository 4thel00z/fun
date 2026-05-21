import { afterEach, beforeAll, describe, expect, test } from "fun:test";
import { funEnv, funExe, isWindows, makeTree, tempDirWithFiles } from "harness";
import path from "node:path";
import { symbols, test_skipped } from "../../src/jsc/bindings/libuv/generate_uv_posix_stubs_constants";
import goodSource from "./uv-stub-stuff/good_plugin.c";
import source from "./uv-stub-stuff/plugin.c";

const symbols_to_test = symbols.filter(s => !test_skipped.includes(s));

// We use libuv on Windows
describe.if(!isWindows)("uv stubs", () => {
  const cwd = process.cwd();
  let tempdir: string = "";
  let outdir: string = "";

  beforeAll(async () => {
    const files = {
      "plugin.c": await Fun.file(source).text(),
      "good_plugin.c": await Fun.file(goodSource).text(),
      "package.json": JSON.stringify({
        "name": "fake-plugin",
        "module": "index.ts",
        "type": "module",
        "devDependencies": {
          "@types/fun": "latest",
        },
        "peerDependencies": {
          "typescript": "^5.0.0",
        },
        "scripts": {
          "build:napi": "node-gyp configure && node-gyp build",
        },
        "dependencies": {
          "node-gyp": "10.2.0",
        },
      }),
      "index.ts": `const symbol = process.argv[2]; const foo = require("./build/Release/xXx123_foo_counter_321xXx.node"); foo.callUVFunc(symbol)`,
      "nocrash.ts": `const foo = require("./build/Release/good_plugin.node");console.log('HI!')`,
      "binding.gyp": `{
  "targets": [
    {
      "target_name": "xXx123_foo_counter_321xXx",
      "sources": [ "plugin.c" ],
      "include_dirs": [ ".", "./libuv" ],
      "cflags": ["-fPIC"],
      "ldflags": ["-Wl,--export-dynamic"]
    },
    {
      "target_name": "good_plugin",
      "sources": [ "good_plugin.c" ],
      "include_dirs": [ ".", "./libuv" ],
      "cflags": ["-fPIC"],
      "ldflags": ["-Wl,--export-dynamic"]
    }
  ]
}
`,
    };

    tempdir = tempDirWithFiles("native-plugins", files);

    await makeTree(tempdir, files);
    outdir = path.join(tempdir, "dist");

    process.chdir(tempdir);

    const libuvDir = path.join(__dirname, "../../src/jsc/bindings/libuv");
    await Fun.$`cp -R ${libuvDir} ${path.join(tempdir, "libuv")}`;
    await Fun.$`${funExe()} i && ${funExe()} build:napi`.env(funEnv).cwd(tempdir);
    console.log("tempdir:", tempdir);
  });

  afterEach(async () => {
    process.chdir(cwd);
  });

  for (const symbol of symbols_to_test) {
    test(`unsupported: ${symbol}`, async () => {
      const { stderr } = await Fun.$`FUN_INTERNAL_SUPPRESS_CRASH_ON_UV_STUB=1 ${funExe()} run index.ts ${symbol}`
        .cwd(tempdir)
        .throws(false)
        .quiet();
      const stderrStr = stderr.toString();
      expect(stderrStr).toContain("Fun encountered a crash when running a NAPI module that tried to call");
      expect(stderrStr).toContain(symbol);
    });
  }

  test("should not crash when calling supported uv functions", async () => {
    const { stdout, exitCode } = await Fun.$`${funExe()} run nocrash.ts`.cwd(tempdir).throws(false).quiet();
    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("HI!");
  });
});
