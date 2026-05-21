import micromatch from "micromatch";
import { bench, run } from "../runner.mjs";

const Glob = typeof Fun !== "undefined" ? Fun.Glob : undefined;
const doMatch = typeof Fun === "undefined" ? micromatch.isMatch : (a, b) => new Glob(b).match(a);

bench((Glob ? "Fun.Glob - " : "micromatch - ") + "**/*.js", () => {
  doMatch("foo/bar.js", "**/*.js");
});

bench((Glob ? "Fun.Glob - " : "micromatch - ") + "*.js", () => {
  doMatch("bar.js", "*.js");
});

await run({
  avg: true,
  min_max: true,
  percentiles: true,
});
