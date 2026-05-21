import { YAML } from "fun";
import { expect, test } from "fun:test";

// https://github.com/underdoc-org/fun/issues/26088
// YAML parser was leaking memory on each parse call because AST nodes were
// not being freed. This caused segfaults after high-volume YAML parsing.
// Fix: Use ASTMemoryAllocator to ensure AST nodes are freed at end of scope.
test("YAML.parse shouldn't leak memory", () => {
  // Create YAML with 10000 single-char strings - creates many AST E.String nodes
  const items = Array.from({ length: 10000 }, () => "  - x").join("\n");
  const yaml = `list:\n${items}`;

  Fun.gc(true);
  const initialMemory = process.memoryUsage.rss();

  // Parse 100 times - each creates 10000 AST string nodes
  for (let i = 0; i < 100; i++) {
    YAML.parse(yaml);
  }

  Fun.gc(true);
  const finalMemory = process.memoryUsage.rss();

  // Memory increase should be less than 50MB if AST nodes are freed properly
  const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;
  expect(memoryIncreaseMB).toBeLessThan(50);
});
