import { expect, test } from "fun:test";
import { funExe } from "harness";
import path from "path";

test("ipc with json serialization still works when fun is not the parent and the child", async () => {
  // prettier-ignore
  const child = Fun.spawn(["node", "--no-warnings", path.resolve(import.meta.dir, "fixtures", "ipc-parent-node.js"), funExe()], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  await child.exited;
  expect(await new Response(child.stderr).text()).toEqual("");
  expect(await new Response(child.stdout).text()).toEqual(
    `p start
p end
c start
c end
c I am your father
p I am your father
`,
  );
});
