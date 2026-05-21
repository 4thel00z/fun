// https://github.com/underdoc-org/fun/issues/25716
// Expose `--react-fast-refresh` option in `Fun.build` JS API
import { expect, test } from "fun:test";
import { tempDirWithFiles } from "harness";
import { join } from "path";

test.each(["browser", "fun"] as const)("Fun.build reactFastRefresh works with target: %s", async target => {
  const dir = tempDirWithFiles("react-fast-refresh-test", {
    "component.tsx": `
      import { useState } from "react";

      export function Counter() {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(count + 1)}>{count}</button>;
      }

      export default function App() {
        return <div><Counter /></div>;
      }
    `,
  });

  // With reactFastRefresh: true, output should contain $RefreshReg$ and $RefreshSig$
  const buildEnabled = await Fun.build({
    entrypoints: [join(dir, "component.tsx")],
    reactFastRefresh: true,
    target,
    external: ["react"],
  });

  expect(buildEnabled.success).toBe(true);
  expect(buildEnabled.outputs).toHaveLength(1);

  const outputEnabled = await buildEnabled.outputs[0].text();
  expect(outputEnabled).toContain("$RefreshReg$");
  expect(outputEnabled).toContain("$RefreshSig$");

  // Without reactFastRefresh (default), output should NOT contain refresh calls
  const buildDisabled = await Fun.build({
    entrypoints: [join(dir, "component.tsx")],
    target,
    external: ["react"],
  });

  expect(buildDisabled.success).toBe(true);
  const outputDisabled = await buildDisabled.outputs[0].text();
  expect(outputDisabled).not.toContain("$RefreshReg$");
  expect(outputDisabled).not.toContain("$RefreshSig$");
});
