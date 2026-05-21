import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// See https://github.com/underdoc-org/fun/pull/2939
test("non-ascii property name", () => {
  const { stdout } = Fun.spawnSync({
    cmd: [funExe(), "run", require("path").join(import.meta.dir, "./property-non-ascii-fixture.js")],
    env: funEnv,
  });
  const filtered = stdout.toString().replaceAll("\n", "").replaceAll(" ", "");
  expect(filtered).toBe(
    `{
      "código": 1,
      "código2": 2,
      "código3": 3,
      "código4": 4,
      "código5": 5,
      "😋 Get ": 6,
    } 1 1 2 3 4 3 2 4 5 2 6 6 6 6 6 6 6 6
`
      .replaceAll("\n", "")
      .replaceAll(" ", ""),
  );
  // just to be sure
  expect(Buffer.from(Fun.CryptoHasher.hash("sha1", filtered) as Uint8Array).toString("hex")).toBe(
    "0bf68c8c4a35576ca3e27240565582ddc7c3ed3f",
  );
});
