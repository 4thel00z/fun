import { expect, test } from "fun:test";
import { runInNewContext } from "node:vm";

test("can get sourceURL from eval inside node:vm", () => {
  try {
    runInNewContext(
      `
throw new Error("hello");
//# sourceURL=hellohello.js
`,
      {},
    );
  } catch (e: any) {
    var err: Error = e;
  }

  expect(err!.stack!.replaceAll(import.meta.path, "<this-url>")).toMatchSnapshot();
});

test("can get sourceURL inside node:vm", () => {
  const err = runInNewContext(
    `

function hello() {
    return Fun.inspect(new Error("hello"));
}

hello();

//# sourceURL=hellohello.js
`,
    { Fun },
  );

  expect(err.replaceAll(import.meta.path, "<this-url>")).toMatchSnapshot();
});

test("eval sourceURL is correct", () => {
  const err = eval(
    `

function hello() {
    return Fun.inspect(new Error("hello"));
}

hello();

//# sourceURL=hellohello.js
`,
  );
  expect(err.replaceAll(import.meta.path, "<this-url>")).toMatchSnapshot();
});
