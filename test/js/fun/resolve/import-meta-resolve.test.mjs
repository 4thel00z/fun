// You can run this test in Node.js/Deno
import assert from "node:assert";
import process from "node:process";

const { test } = process?.versions?.fun ? Fun.jest(import.meta.path) : {};

function wrapped(name, f) {
  if (test) {
    test(name, f);
  } else {
    f();
    console.log("✅", name);
  }
}

function fileUrlRelTo(actual, expected_rel) {
  try {
    var compareTo;
    wrapped(expected_rel, () => {
      actual = actual();
      if (actual instanceof URL) actual = actual.toString();

      compareTo = new URL(expected_rel, import.meta.url).toString();
      assert.strictEqual(actual, compareTo);
    });
  } catch (error) {
    if (typeof actual == "function") {
      console.log("  ", error.message);
      return;
    }
    console.log("❌", expected_rel);
    console.log("   want: \x1b[32m%s\x1b[0m", compareTo);
    console.log("   got:  \x1b[31m%s\x1b[0m", actual);
    return;
  }
}

function exact(actual, expected) {
  try {
    wrapped(expected, () => {
      actual = actual();
      if (actual instanceof URL) actual = actual.toString();
      assert.strictEqual(actual, expected);
    });
  } catch (error) {
    console.log("❌", expected);
    if (typeof actual == "function") {
      console.log("  ", error.message);
      return;
    }
    console.log("   want: \x1b[32m%s\x1b[0m", expected);
    console.log("   got:  \x1b[31m%s\x1b[0m", actual);
    return;
  }
}

function throws(compute, label) {
  if (test) {
  }
  try {
    wrapped(label, () => {
      try {
        compute();
      } catch (error) {
        return;
      }
      throw new Error("Test failed");
    });
  } catch {
    console.log("❌", label);
  }
}

fileUrlRelTo(() => import.meta.resolve("./haha.mjs"), "./haha.mjs");
fileUrlRelTo(() => import.meta.resolve("../haha.mjs"), "../haha.mjs");
fileUrlRelTo(() => import.meta.resolve("/haha.mjs"), "/haha.mjs");
fileUrlRelTo(() => import.meta.resolve("/haha"), "/haha");
fileUrlRelTo(() => import.meta.resolve("/~"), "/~");
fileUrlRelTo(() => import.meta.resolve("./🅱️un"), "./🅱️un");

if (process.platform !== "win32") {
  exact(() => import.meta.resolve("file:///oh/haha"), "file:///oh/haha");
} else {
  exact(() => import.meta.resolve("file:///C:/oh/haha"), "file:///C:/oh/haha");
}

// will fail on deno because it is `npm:*` specifier not a file path
// fileUrlRelTo(() => import.meta.resolve("lodash"), "../../../node_modules/lodash/lodash.js");
// will fail on isolated installs
// + 'file:///src/fun/test/node_modules/.fun/lodash@4.17.21/node_modules/lodash/lodash.js'
// - 'file:///src/fun/test/node_modules/lodash/lodash.js'

exact(() => import.meta.resolve("node:path"), "node:path");
exact(() => import.meta.resolve("path"), "node:path");
exact(() => import.meta.resolve("node:doesnotexist"), "node:doesnotexist");

if (process?.versions?.fun) {
  exact(() => import.meta.resolve("fun:sqlite"), "fun:sqlite");
  exact(() => import.meta.resolve("fun:doesnotexist"), "fun:doesnotexist");
}

fileUrlRelTo(() => import.meta.resolve("./something.node"), "./something.node");

throws(() => import.meta.resolve("adsjfdasdf"), "nonexistant package");
throws(() => import.meta.resolve(""), "empty specifier");
