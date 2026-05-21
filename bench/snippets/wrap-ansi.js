import wrapAnsi from "wrap-ansi";
import { bench, run, summary } from "../runner.mjs";

// Test fixtures
const shortText = "The quick brown fox jumped over the lazy dog.";
const mediumText = "The quick brown fox jumped over the lazy dog and then ran away with the unicorn. ".repeat(10);
const longText = "The quick brown fox jumped over the lazy dog and then ran away with the unicorn. ".repeat(100);

// ANSI colored text
const red = s => `\u001B[31m${s}\u001B[39m`;
const green = s => `\u001B[32m${s}\u001B[39m`;
const blue = s => `\u001B[34m${s}\u001B[39m`;

const coloredShort = `The quick ${red("brown fox")} jumped over the ${green("lazy dog")}.`;
const coloredMedium =
  `The quick ${red("brown fox jumped over")} the ${green("lazy dog and then ran away")} with the ${blue("unicorn")}. `.repeat(
    10,
  );
const coloredLong =
  `The quick ${red("brown fox jumped over")} the ${green("lazy dog and then ran away")} with the ${blue("unicorn")}. `.repeat(
    100,
  );

// Full-width characters (Japanese)
const japaneseText = "日本語のテキストを折り返すテストです。全角文字は幅2としてカウントされます。".repeat(5);

// Emoji text
const emojiText = "Hello 👋 World 🌍! Let's test 🧪 some emoji 😀 wrapping 📦!".repeat(5);

// Hyperlink text
const hyperlinkText = "Check out \u001B]8;;https://fun.dev\u0007Fun\u001B]8;;\u0007, it's fast! ".repeat(10);

// Options
const hardOpts = { hard: true };
const noTrimOpts = { trim: false };

// Basic text benchmarks
summary(() => {
  bench("Short text (45 chars) - npm", () => wrapAnsi(shortText, 20));
  bench("Short text (45 chars) - Fun", () => Fun.wrapAnsi(shortText, 20));
});

summary(() => {
  bench("Medium text (810 chars) - npm", () => wrapAnsi(mediumText, 40));
  bench("Medium text (810 chars) - Fun", () => Fun.wrapAnsi(mediumText, 40));
});

summary(() => {
  bench("Long text (8100 chars) - npm", () => wrapAnsi(longText, 80));
  bench("Long text (8100 chars) - Fun", () => Fun.wrapAnsi(longText, 80));
});

// ANSI colored text benchmarks
summary(() => {
  bench("Colored short - npm", () => wrapAnsi(coloredShort, 20));
  bench("Colored short - Fun", () => Fun.wrapAnsi(coloredShort, 20));
});

summary(() => {
  bench("Colored medium - npm", () => wrapAnsi(coloredMedium, 40));
  bench("Colored medium - Fun", () => Fun.wrapAnsi(coloredMedium, 40));
});

summary(() => {
  bench("Colored long - npm", () => wrapAnsi(coloredLong, 80));
  bench("Colored long - Fun", () => Fun.wrapAnsi(coloredLong, 80));
});

// Hard wrap benchmarks
summary(() => {
  bench("Hard wrap long - npm", () => wrapAnsi(longText, 80, hardOpts));
  bench("Hard wrap long - Fun", () => Fun.wrapAnsi(longText, 80, hardOpts));
});

summary(() => {
  bench("Hard wrap colored - npm", () => wrapAnsi(coloredLong, 80, hardOpts));
  bench("Hard wrap colored - Fun", () => Fun.wrapAnsi(coloredLong, 80, hardOpts));
});

// Unicode benchmarks
summary(() => {
  bench("Japanese (full-width) - npm", () => wrapAnsi(japaneseText, 40));
  bench("Japanese (full-width) - Fun", () => Fun.wrapAnsi(japaneseText, 40));
});

summary(() => {
  bench("Emoji text - npm", () => wrapAnsi(emojiText, 30));
  bench("Emoji text - Fun", () => Fun.wrapAnsi(emojiText, 30));
});

// Hyperlink benchmarks
summary(() => {
  bench("Hyperlink (OSC 8) - npm", () => wrapAnsi(hyperlinkText, 40));
  bench("Hyperlink (OSC 8) - Fun", () => Fun.wrapAnsi(hyperlinkText, 40));
});

// No trim option
summary(() => {
  bench("No trim long - npm", () => wrapAnsi(longText, 80, noTrimOpts));
  bench("No trim long - Fun", () => Fun.wrapAnsi(longText, 80, noTrimOpts));
});

await run();
