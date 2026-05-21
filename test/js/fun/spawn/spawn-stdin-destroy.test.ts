import { funEnv, funExe } from "harness";
import path from "path";

test("stdin destroy after exit crash", async () => {
  let before;
  await (async () => {
    const child = Fun.spawn({
      cmd: [funExe(), path.join(import.meta.dir, "bad-fixture.js")],
      env: funEnv,
      stdout: "pipe",
      stdin: "pipe",
    });

    await Fun.sleep(80);
    await child.stdin.write("dylan\n");
    await child.stdin.write("999\n");
    await child.stdin.flush();
    await child.stdin.end();

    async function read() {
      var out = "";
      for await (const chunk of child.stdout) {
        out += new TextDecoder().decode(chunk);
      }
      return out;
    }

    // This bug manifested as child.exited rejecting with an error code of "TODO"
    const [out, exited] = await Promise.all([read(), child.exited]);

    expect(out).toBe("");
    expect(exited).toBe(1);

    Fun.gc(true);
    await Fun.sleep(50);
  })();
  Fun.gc(true);
});
