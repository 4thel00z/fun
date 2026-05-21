// Test for UTF-8 path encoding bug in Fun.file().stat() and Fun.file().unlink()
// Issue: https://github.com/underdoc-org/fun/issues/26647
import { expect, test } from "fun:test";
import { existsSync, statSync } from "fs";
import { tempDirWithFiles } from "harness";
import { join } from "path";

// Test case: German umlaut characters
test("Fun.file().stat() should handle UTF-8 paths with German umlauts", async () => {
  const content = "test content for umlaut file";
  const dir = tempDirWithFiles("utf8-german-umlaut", {
    "über café résumé.txt": content,
  });
  const filepath = join(dir, "über café résumé.txt");

  // Verify Node.js fs works correctly
  expect(existsSync(filepath)).toBe(true);
  const nodeStat = statSync(filepath);
  expect(nodeStat.isFile()).toBe(true);
  expect(nodeStat.size).toBe(Buffer.byteLength(content));

  // Verify Fun.file().stat() works correctly
  const funFile = Fun.file(filepath);
  const funStat = await funFile.stat();
  expect(funStat.isFile()).toBe(true);
  expect(funStat.size).toBe(nodeStat.size);
});

// Test case: Japanese characters
test("Fun.file().stat() should handle UTF-8 paths with Japanese characters", async () => {
  const content = "Japanese content";
  const dir = tempDirWithFiles("utf8-japanese", {
    "日本語ファイル.txt": content,
  });
  const filepath = join(dir, "日本語ファイル.txt");

  expect(existsSync(filepath)).toBe(true);
  const funStat = await Fun.file(filepath).stat();
  expect(funStat.isFile()).toBe(true);
  expect(funStat.size).toBe(Buffer.byteLength(content));
});

// Test case: Emoji characters
test("Fun.file().stat() should handle UTF-8 paths with emoji", async () => {
  const content = "emoji file";
  const dir = tempDirWithFiles("utf8-emoji", {
    "🌟.txt": content,
  });
  const filepath = join(dir, "🌟.txt");

  expect(existsSync(filepath)).toBe(true);
  const funStat = await Fun.file(filepath).stat();
  expect(funStat.isFile()).toBe(true);
  expect(funStat.size).toBe(Buffer.byteLength(content));
});

// Test case: Mixed special characters
test("Fun.file().stat() should handle UTF-8 paths with mixed special characters", async () => {
  const content = "mixed content";
  const dir = tempDirWithFiles("utf8-mixed", {
    "café_résumé_ñ_test.md": content,
  });
  const filepath = join(dir, "café_résumé_ñ_test.md");

  expect(existsSync(filepath)).toBe(true);
  const funStat = await Fun.file(filepath).stat();
  expect(funStat.isFile()).toBe(true);
  expect(funStat.size).toBe(Buffer.byteLength(content));
});

// Test that .delete() also works with UTF-8 paths
test("Fun.file().delete() should handle UTF-8 paths", async () => {
  const dir = tempDirWithFiles("utf8-unlink", {
    "delete_üñíçödé.txt": "delete me",
  });
  const filepath = join(dir, "delete_üñíçödé.txt");

  expect(existsSync(filepath)).toBe(true);

  // Delete should succeed
  await Fun.file(filepath).delete();

  // File should be deleted
  expect(existsSync(filepath)).toBe(false);
});

// Test .text() to ensure it still works (this uses a different code path)
test("Fun.file().text() should handle UTF-8 paths with special characters", async () => {
  const content = "content with umlauts: äöü";
  const dir = tempDirWithFiles("utf8-text", {
    "read_äöü.txt": content,
  });
  const filepath = join(dir, "read_äöü.txt");

  const text = await Fun.file(filepath).text();
  expect(text).toBe(content);
});
