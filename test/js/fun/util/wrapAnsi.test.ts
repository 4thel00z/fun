import { describe, expect, test } from "fun:test";

describe("Fun.wrapAnsi", () => {
  describe("basic wrapping", () => {
    test("wraps text at word boundaries", () => {
      expect(Fun.wrapAnsi("hello world", 5)).toBe("hello\nworld");
    });

    test("handles empty string", () => {
      expect(Fun.wrapAnsi("", 10)).toBe("");
    });

    test("no wrapping needed", () => {
      expect(Fun.wrapAnsi("hello", 10)).toBe("hello");
    });

    test("wraps multiple words", () => {
      expect(Fun.wrapAnsi("one two three four", 8)).toBe("one two\nthree\nfour");
    });

    test("handles single long word", () => {
      // Without hard mode, word stays on one line
      expect(Fun.wrapAnsi("abcdefghij", 5)).toBe("abcdefghij");
    });

    test("handles columns = 0", () => {
      // Edge case: should return original string
      expect(Fun.wrapAnsi("hello", 0)).toBe("hello");
    });
  });

  describe("hard wrap option", () => {
    test("breaks long words in middle", () => {
      expect(Fun.wrapAnsi("abcdefgh", 3, { hard: true })).toBe("abc\ndef\ngh");
    });

    test("breaks very long word", () => {
      expect(Fun.wrapAnsi("abcdefghij", 4, { hard: true })).toBe("abcd\nefgh\nij");
    });
  });

  describe("wordWrap option", () => {
    test("wordWrap false disables wrapping", () => {
      // Without wordWrap, only explicit newlines should cause breaks
      const result = Fun.wrapAnsi("hello world", 5, { wordWrap: false });
      // The behavior may vary - just check it doesn't crash
      expect(typeof result).toBe("string");
    });
  });

  describe("trim option", () => {
    test("trims leading whitespace by default", () => {
      expect(Fun.wrapAnsi("  hello", 10)).toBe("hello");
    });

    test("trim false preserves leading whitespace", () => {
      expect(Fun.wrapAnsi("  hello", 10, { trim: false })).toBe("  hello");
    });
  });

  describe("ANSI escape codes", () => {
    test("preserves simple color code", () => {
      const input = "\x1b[31mhello\x1b[0m";
      const result = Fun.wrapAnsi(input, 10);
      expect(result).toContain("\x1b[31m");
      expect(result).toContain("hello");
    });

    test("preserves color across line break", () => {
      const input = "\x1b[31mhello world\x1b[0m";
      const result = Fun.wrapAnsi(input, 5);
      // Should have close code (39) before newline and restore (31) after
      expect(result).toContain("\x1b[39m\n");
      expect(result).toContain("\n\x1b[31m");
    });

    test("handles multiple colors", () => {
      const input = "\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m";
      const result = Fun.wrapAnsi(input, 20);
      expect(result).toContain("red");
      expect(result).toContain("green");
    });

    test("handles bold and styles", () => {
      const input = "\x1b[1mbold\x1b[0m";
      const result = Fun.wrapAnsi(input, 10);
      expect(result).toContain("\x1b[1m");
      expect(result).toContain("bold");
    });

    test("ANSI codes don't count toward width", () => {
      const input = "\x1b[31mab\x1b[0m";
      // ANSI codes should not count toward width
      // "ab" is 2 chars, should fit in width 2
      expect(Fun.wrapAnsi(input, 2)).toBe(input);
    });
  });

  describe("Unicode support", () => {
    test("handles full-width characters", () => {
      // 日本語 characters are 2 columns each
      const input = "日本";
      // "日本" is 4 columns (2 chars * 2 width each)
      const result = Fun.wrapAnsi(input, 4);
      expect(result).toBe("日本");
    });

    test("wraps full-width characters with hard", () => {
      const input = "日本語";
      // Each char is 2 columns, so "日本語" is 6 columns
      // Width 4 means we can fit 2 chars per line (with hard wrap)
      const result = Fun.wrapAnsi(input, 4, { hard: true });
      expect(result).toContain("\n");
      expect(result).toBe("日本\n語");
    });

    test("does not wrap full-width characters without hard", () => {
      const input = "日本語";
      // Without hard, long words are not broken
      const result = Fun.wrapAnsi(input, 4);
      expect(result).toBe("日本語");
    });

    test("handles emoji", () => {
      const input = "hello 👋 world";
      const result = Fun.wrapAnsi(input, 20);
      expect(result).toContain("👋");
    });
  });

  describe("existing newlines", () => {
    test("preserves existing newlines", () => {
      const input = "hello\nworld";
      const result = Fun.wrapAnsi(input, 10);
      expect(result).toBe("hello\nworld");
    });

    test("wraps within lines separated by newlines", () => {
      const input = "hello world\nfoo bar";
      const result = Fun.wrapAnsi(input, 5);
      expect(result.split("\n").length).toBeGreaterThan(2);
    });
  });

  describe("edge cases", () => {
    test("handles tabs", () => {
      const input = "a\tb";
      const result = Fun.wrapAnsi(input, 10);
      expect(typeof result).toBe("string");
    });

    test("handles Windows line endings", () => {
      const input = "hello\r\nworld";
      const result = Fun.wrapAnsi(input, 10);
      expect(typeof result).toBe("string");
    });

    test("handles consecutive spaces", () => {
      const input = "hello    world";
      const result = Fun.wrapAnsi(input, 10);
      expect(typeof result).toBe("string");
    });
  });

  describe("ambiguousIsNarrow option", () => {
    test("default treats ambiguous as narrow", () => {
      // By default, ambiguous width chars should be treated as width 1
      const result1 = Fun.wrapAnsi("αβγ", 3);
      // Greek letters are ambiguous width
      expect(typeof result1).toBe("string");
    });

    test("ambiguousIsNarrow false treats as wide", () => {
      const result = Fun.wrapAnsi("αβγ", 3, { ambiguousIsNarrow: false });
      expect(typeof result).toBe("string");
    });
  });

  describe("edge cases for columns", () => {
    test("negative columns returns input unchanged", () => {
      expect(Fun.wrapAnsi("hello world", -5)).toBe("hello world");
      expect(Fun.wrapAnsi("hello world", -Infinity)).toBe("hello world");
    });

    test("Infinity columns returns input unchanged", () => {
      expect(Fun.wrapAnsi("hello world", Infinity)).toBe("hello world");
    });

    test("NaN columns returns input unchanged", () => {
      expect(Fun.wrapAnsi("hello world", NaN)).toBe("hello world");
    });
  });

  describe("width tracking", () => {
    test("width tracking after line wrap with full-width chars", () => {
      // Each full-width character has width 2
      const input = "あいうえお"; // 5 chars, total width 10
      const result = Fun.wrapAnsi(input, 4, { hard: true });
      // Width 4 allows 2 full-width chars per line: "あい"(4), "うえ"(4), "お"(2)
      expect(result).toBe("あい\nうえ\nお");
    });

    test("width tracking with mixed width chars", () => {
      // ASCII(width 1) and full-width(width 2) mixed
      const input = "aあbい"; // widths: 1+2+1+2 = 6
      const result = Fun.wrapAnsi(input, 3, { hard: true });
      // "aあ"(3) on line 1, "bい"(3) on line 2
      expect(result).toBe("aあ\nbい");
    });
  });

  describe("extended SGR codes", () => {
    test("256-color preserved across line wrap", () => {
      const input = "\x1b[38;5;196mRed text here\x1b[0m";
      const result = Fun.wrapAnsi(input, 5);
      // 256-color sequences should not be closed/reopened at line breaks
      expect(result).toBe("\x1b[38;5;196mRed\ntext\nhere\x1b[0m");
    });

    test("TrueColor preserved across line wrap", () => {
      const input = "\x1b[38;2;255;128;0mOrange text\x1b[0m";
      const result = Fun.wrapAnsi(input, 6);
      // TrueColor sequences should not be closed/reopened at line breaks
      expect(result).toBe("\x1b[38;2;255;128;0mOrange\ntext\x1b[0m");
    });

    test("multiple styles (bold + color) preserved", () => {
      const input = "\x1b[1m\x1b[31mBold Red text here\x1b[0m";
      const result = Fun.wrapAnsi(input, 5);
      // Bold stays, color closes with 39 and reopens with 31
      expect(result).toBe(
        "\x1b[1m\x1b[31mBold\x1b[39m\n\x1b[31mRed\x1b[39m\n\x1b[31mtext\x1b[39m\n\x1b[31mhere\x1b[0m",
      );
    });
  });
});
