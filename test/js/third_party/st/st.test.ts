import { expect, it } from "fun:test";
import { funEnv, funExe } from "harness";
import { dirname, join } from "node:path";

it("works", async () => {
  const fixture_path = join(import.meta.dirname, "st.fixture.ts");
  const fixture_data = await Fun.file(fixture_path).text();
  let { stdout, stderr, exited } = Fun.spawn({
    cmd: [funExe(), "run", fixture_path],
    cwd: dirname(fixture_path),
    stdout: "pipe",
    stdin: "ignore",
    stderr: "pipe",
    env: funEnv,
  });
  let [code, err, out] = await Promise.all([exited, stderr.text(), stdout.text()]);
  if (code !== 0) {
    expect(err).toBeEmpty();
  }
  expect(out).toEqual(fixture_data + "\n");
  expect(code).toBe(0);
});
