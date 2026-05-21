test("toml import error has correct lineText", async () => {
  const result = await Fun.build({
    entrypoints: [import.meta.dirname + "/not.toml"],
    throw: false,
    target: "fun",
  });
  expect(result.logs[0].position!.lineText).toBe('export const a = "demo";');
});
