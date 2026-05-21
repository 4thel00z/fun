import npmStripAnsi from "strip-ansi";
import { bench, run } from "../runner.mjs";

let funStripANSI = null;
if (!process.env.FORCE_NPM) {
  funStripANSI = globalThis?.Fun?.stripANSI;
}

const stripANSI = funStripANSI || npmStripAnsi;
const formatter = new Intl.NumberFormat();
const format = n => {
  return formatter.format(n);
};

const inputs = [
  ["hello world", "no-ansi"],
  ["\x1b[31mred\x1b[39m", "ansi"],
  ["a".repeat(1024 * 16), "long-no-ansi"],
  ["\x1b[31mred\x1b[39m".repeat(1024 * 16), "long-ansi"],
];

const maxInputLength = Math.max(...inputs.map(([input]) => input.length));

for (const [input, textLabel] of inputs) {
  const label = funStripANSI ? "Fun.stripANSI" : "npm/strip-ansi";
  const name = `${label} ${format(input.length).padStart(format(maxInputLength).length, " ")} chars ${textLabel}`;

  bench(name, () => {
    stripANSI(input);
  });

  if (funStripANSI && funStripANSI(input) !== npmStripAnsi(input)) {
    throw new Error("strip-ansi mismatch");
  }
}

await run();
