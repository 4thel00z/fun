import { afterEach, describe, expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// Tracks exit code from the last runMd() call so individual tests can
// assert it after snapshotting stdout (giving a readable diff on failure).
let lastExitCode: number | null = null;

async function runMd(source: string, env: Record<string, string> = {}) {
  using dir = tempDir("md-entry-", { "doc.md": source });
  await using proc = Fun.spawn({
    cmd: [funExe(), "./doc.md"],
    env: { ...funEnv, FORCE_COLOR: "1", TERM: "xterm-256color", ...env },
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  // stderr intentionally not asserted: ASAN builds emit a warning there.
  const [stdout, _stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  lastExitCode = exitCode;
  return stdout;
}

describe("fun <file.md>", () => {
  afterEach(() => {
    // Implicit exit-code assertion for every test that relies on runMd().
    if (lastExitCode !== null) {
      expect(lastExitCode).toBe(0);
      lastExitCode = null;
    }
  });

  test("renders headings with underlines", async () => {
    expect(
      await runMd(["# Heading 1", "", "## Heading 2", "", "### Heading 3", "", "body", ""].join("\n")),
    ).toMatchSnapshot();
  });

  test("renders bold, italic, strikethrough, inline code", async () => {
    expect(await runMd("**bold** *italic* ~~strike~~ `code` regular\n")).toMatchSnapshot();
  });

  test("renders ordered, unordered, and task lists", async () => {
    expect(
      await runMd(
        [
          "1. first",
          "2. second",
          "3. third",
          "",
          "- apple",
          "- banana",
          "- cherry",
          "",
          "- [ ] todo",
          "- [x] done",
          "",
        ].join("\n"),
      ),
    ).toMatchSnapshot();
  });

  test("renders blockquotes and nested blockquotes", async () => {
    expect(await runMd(["> A quote", ">", "> > Nested quote", ""].join("\n"))).toMatchSnapshot();
  });

  test("renders horizontal rules", async () => {
    expect(await runMd(["above", "", "---", "", "below", ""].join("\n"))).toMatchSnapshot();
  });

  test("renders fenced code block with JS syntax highlighting", async () => {
    expect(
      await runMd(["```js", 'const name = "world";', "console.log(`hello ${name}`);", "```", ""].join("\n")),
    ).toMatchSnapshot();
  });

  test("renders fenced code block without language", async () => {
    expect(await runMd(["```", "plain text", "no highlighting", "```", ""].join("\n"))).toMatchSnapshot();
  });

  test("renders link text with url fallback when no TTY", async () => {
    // runMd() spawns Fun with stdout:"pipe", so Output.isStdoutTTY() is
    // false and hyperlinks fall back to `text (url)`. The OSC 8 path fires
    // when stdout really is a TTY.
    expect(await runMd("Visit [Fun](https://fun.dev) today.\n")).toMatchSnapshot();
  });

  test("emits OSC 8 escape for links when hyperlinks are enabled", async () => {
    // runMd() pipes stdout so the CLI path can't see a TTY; drive the
    // JS API directly with hyperlinks:true to cover the OSC 8 branch.
    await using proc = Fun.spawn({
      cmd: [
        funExe(),
        "-e",
        `process.stdout.write(Fun.markdown.ansi("see [Fun](https://fun.dev)\\n", { hyperlinks: true }))`,
      ],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, _stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    // Output must contain the OSC 8 opener + closer around the link.
    expect(stdout).toContain("\x1b]8;;https://fun.dev\x1b\\");
    expect(stdout).toContain("\x1b]8;;\x1b\\");
    expect(exitCode).toBe(0);
  });

  test("renders link with text + url pair fallback", async () => {
    expect(await runMd("see [Fun](https://fun.dev)\n")).toMatchSnapshot();
  });

  test("renders images as alt text with link", async () => {
    expect(await runMd("![an image](https://fun.dev/logo.png)\n")).toMatchSnapshot();
  });

  test("renders wikilinks", async () => {
    expect(await runMd("see [[SomePage]] for more\n")).toMatchSnapshot();
  });

  // Regression: the parser's `[[` fast-path used to skip emitting the
  // preceding text when the wikilink failed to close. `foo [[bar baz`
  // should render the full text literally, not drop the `foo ` prefix.
  test("falls back to literal text when `[[` never closes", async () => {
    expect(await runMd("foo [[bar baz\n")).toMatchSnapshot();
  });

  test("renders simple table with alignment", async () => {
    expect(
      await runMd(
        [
          "| Name  | Age | City |",
          "|:------|:---:|-----:|",
          "| Alice |  30 |  NYC |",
          "| Bob   |  25 |   LA |",
          "",
        ].join("\n"),
      ),
    ).toMatchSnapshot();
  });

  test("renders table with CJK multi-width graphemes", async () => {
    expect(
      await runMd(
        [
          "| 名前   | 言語       | 都市       |",
          "|:-------|:----------:|-----------:|",
          "| 山田   | 日本語     | 東京       |",
          "| Alice  | English    | NYC        |",
          "",
        ].join("\n"),
      ),
    ).toMatchSnapshot();
  });

  test("renders table with emoji graphemes", async () => {
    expect(
      await runMd(
        [
          "| Status | Label  |",
          "|:------:|:-------|",
          "| ✅     | pass   |",
          "| ❌     | fail   |",
          "| 🚀     | launch |",
          "",
        ].join("\n"),
      ),
    ).toMatchSnapshot();
  });

  test("renders combining characters without breaking alignment", async () => {
    // Decomposed NFD: 'e' + U+0301 combining acute, 'i' + U+0308 combining diaeresis.
    // These must be zero-width in the grapheme counter for the table to line up.
    const stdout = await runMd(
      ["| Name   | Note |", "|:-------|:-----|", "| cafe\u0301   | hot  |", "| nai\u0308ve  | ok   |", ""].join("\n"),
    );
    expect(stdout).toMatchSnapshot();
    expect(lastExitCode).toBe(0);
  });

  test("renders inline formatting inside table cells", async () => {
    const stdout = await runMd(
      [
        "| Name  | Style     |",
        "|:------|:----------|",
        "| **Alice** | *editor* |",
        "| `bob` | [link](https://fun.dev) |",
        "",
      ].join("\n"),
    );
    expect(stdout).toMatchSnapshot();
    expect(lastExitCode).toBe(0);
  });

  test("renders inline formatting inside headings", async () => {
    const stdout = await runMd("# Hello **bold** and *italic* heading\n");
    expect(stdout).toMatchSnapshot();
    expect(lastExitCode).toBe(0);
  });

  test("nested code span inside bold keeps outer bold", async () => {
    const stdout = await runMd("**before `code` after** tail\n");
    expect(stdout).toMatchSnapshot();
    expect(lastExitCode).toBe(0);
  });

  test("renders mixed inline styles with autolinks", async () => {
    expect(await runMd("Check **https://fun.dev** and <me@example.com>!\n")).toMatchSnapshot();
  });

  test("renders nested lists", async () => {
    expect(
      await runMd(["- outer", "  - inner 1", "  - inner 2", "    - deep", "- second outer", ""].join("\n")),
    ).toMatchSnapshot();
  });

  test("runs without colors when NO_COLOR is set", async () => {
    using dir = tempDir("md-no-color-", {
      "doc.md": "# Hello\n\n**world**\n",
    });
    const env = { ...funEnv, NO_COLOR: "1" };
    // FORCE_COLOR set to anything (even "") forces colors on, so drop it.
    delete env.FORCE_COLOR;
    await using proc = Fun.spawn({
      cmd: [funExe(), "./doc.md"],
      env,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, _stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    // No escape characters expected
    expect(stdout).not.toContain("\x1b[");
    expect(stdout).toMatchSnapshot();
    expect(exitCode).toBe(0);
  });

  test("renders via `fun run ./file.md`", async () => {
    using dir = tempDir("md-run-", { "doc.md": "# Title\n\nbody\n" });
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "./doc.md"],
      env: { ...funEnv, FORCE_COLOR: "1", TERM: "xterm-256color" },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, _stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout).toMatchSnapshot();
    expect(exitCode).toBe(0);
  });

  test("renders .markdown extension too", async () => {
    using dir = tempDir("md-ext-", { "doc.markdown": "# yep\n" });
    await using proc = Fun.spawn({
      cmd: [funExe(), "./doc.markdown"],
      env: { ...funEnv, FORCE_COLOR: "1", TERM: "xterm-256color" },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, _stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout).toMatchSnapshot();
    expect(exitCode).toBe(0);
  });

  // Every emitted line must fit the terminal — checked via Fun.stringWidth
  // (visible width, ANSI-stripped) so escape sequences don't inflate the
  // count.
  function maxLineWidth(out: string): number {
    return Math.max(0, ...out.split("\n").map(l => Fun.stringWidth(l)));
  }

  test("wraps inline code spans within COLUMNS, never mid-word", async () => {
    const out = await runMd(
      "After modifying `coreBeeps.ts`, `controlBoops.ts`, or `toolBoops.ts`, run " +
        "`fun run build:boop` to regenerate. **Do not edit `*.generated.ts` files directly.**\n",
      { COLUMNS: "45" },
    );
    expect(maxLineWidth(out)).toBeLessThanOrEqual(45);
    expect(out).toMatchSnapshot();
  });

  test("hard-breaks an overlong CJK word at the visible-width boundary", async () => {
    // 60 bytes = 20 CJK chars = 40 visible columns; must wrap at 30.
    const out = await runMd("A " + Buffer.alloc(60, "测试").toString() + " wide.\n", { COLUMNS: "30" });
    expect(out).not.toContain("\uFFFD");
    expect(maxLineWidth(out)).toBeLessThanOrEqual(30);
    expect(out).toMatchSnapshot();
  });

  test("shrinks table columns to fit COLUMNS and wraps cell content", async () => {
    const out = await runMd(
      [
        "| Path | Scope |",
        "| --- | --- |",
        "| `docs/guide.md` | Top-level architecture: module map, startup flow, state management |",
        "| `docs/components/design-system/guide.md` | Design system component API (Dialog, Tabs, StatusIcon, etc.) |",
        "",
      ].join("\n"),
      { COLUMNS: "50" },
    );
    expect(maxLineWidth(out)).toBeLessThanOrEqual(50);
    // Borders stay aligned: every non-blank line starts and ends with `│`
    // (or the matching corner/junction char for the top/bottom/separator).
    for (const line of out.split("\n")) {
      if (line.trim().length === 0) continue;
      const stripped = Fun.stripANSI(line);
      expect(
        stripped.startsWith("│") || stripped.startsWith("┌") || stripped.startsWith("├") || stripped.startsWith("└"),
      ).toBe(true);
      expect(stripped.endsWith("│") || stripped.endsWith("┐") || stripped.endsWith("┤") || stripped.endsWith("┘")).toBe(
        true,
      );
    }
    expect(out).toMatchSnapshot();
  });

  // Regression: the row-wrapper's word-break refinement used a raw byte
  // scan for the last space inside the cut, which found spaces inside an
  // OSC 8 URL (e.g. `[text](<https://host/my file.png>)`) and truncated
  // the escape sequence mid-URL, corrupting every subsequent row.
  //
  // Triggering this needs the URL space to be the ONLY space in the
  // refinement window: the link is the first content in the cell and is
  // followed by unbreakable text (no literal spaces) that forces a wrap
  // BEFORE any external space appears — so lastIndexOfChar(' ') has
  // nothing else to return.
  test("table link with space in URL keeps OSC 8 sequences intact", () => {
    const source = "| Col |\n" + "|---|\n" + "| [c](<https://host/my file.png>)longunbreakabletailtextxx |\n";
    const out = Fun.markdown.ansi(source, { hyperlinks: true, columns: 25 });
    // Full URL (including the space) must survive inside the opener.
    expect(out).toContain("\x1b]8;;https://host/my file.png\x1b\\");
    // Every OSC 8 opener must have its own ST before the next one starts
    // — a truncation would leave an opener dangling.
    let i = 0;
    let openers = 0;
    while (true) {
      const open = out.indexOf("\x1b]8;;", i);
      if (open === -1) break;
      openers++;
      const close = out.indexOf("\x1b\\", open);
      expect(close).not.toBe(-1);
      const nextOpen = out.indexOf("\x1b]8;;", open + 5);
      if (nextOpen !== -1) expect(close).toBeLessThan(nextOpen);
      i = close + 2;
    }
    expect(openers).toBeGreaterThanOrEqual(2);
  });
});
