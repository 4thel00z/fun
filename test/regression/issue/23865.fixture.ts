// Should not crash
test("abc", () => {
  expect(async () => {
    await Fun.sleep(100);
    throw new Error("uh oh!");
  }).toThrow("uh oh!");
}, 50);
