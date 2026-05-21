import { expect, test } from "fun:test";
import { funExe } from "harness";
import path from "path";

test("ipc with json serialization still works when fun is parent and not the child", async () => {
  const child = Fun.spawn([funExe(), path.resolve(import.meta.dir, "fixtures", "ipc-parent-fun.js")], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  await child.exited;
  expect(await new Response(child.stdout).text()).toEqual(
    `p start
p end
c start
c end
c I am your father
p I am your father
`,
  );
  expect(await new Response(child.stderr).text()).toEqual("");
});
