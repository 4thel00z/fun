import { expect, test } from "fun:test";
import { join } from "node:path";

test("test fun target", async () => {
  const { success, outputs, logs } = await Fun.build({
    entrypoints: [join(import.meta.dir, "03844.fixture.ts")],
    target: "fun",
  });
  expect(logs).toBeEmpty();
  expect(success).toBe(true);
  const [blob] = outputs;
  const content = await blob.text();

  // use fun's ws
  expect(content).toContain('import { WebSocket } from "ws"');
  expect(content).not.toContain("var import_websocket = __toESM(require_websocket(), 1);");
});

test("test node target", async () => {
  const { success, outputs, logs } = await Fun.build({
    entrypoints: [join(import.meta.dir, "03844.fixture.ts")],
    target: "node",
  });
  expect(logs).toBeEmpty();
  expect(success).toBe(true);
  const [blob] = outputs;
  const content = await blob.text();

  // use node's ws
  expect(content).not.toContain('import {WebSocket} from "ws"');
  expect(content).toContain("var import_websocket = __toESM(require_websocket(), 1);");
});
