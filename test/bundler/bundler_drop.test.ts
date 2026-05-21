import { describe } from "fun:test";
import { itBundled } from "./expectBundled";

describe("bundler", () => {
  itBundled("drop/FunctionCall", {
    files: {
      "/a.js": `console.log("hello");`,
    },
    run: { stdout: "" },
    drop: ["console"],
    backend: "api",
  });
  itBundled("drop/DebuggerStmt", {
    files: {
      "/a.js": `if(true){debugger;debugger;};debugger;function y(){ debugger; }y()`,
    },
    drop: ["debugger"],
    backend: "api",
    onAfterBundle(api) {
      api.expectFile("out.js").not.toInclude("debugger");
    },
  });
  itBundled("drop/NoDisableDebugger", {
    files: {
      "/a.js": `if(true){debugger;debugger;};debugger;function y(){ debugger; }y();`,
    },
    backend: "api",
    onAfterBundle(api) {
      api.expectFile("out.js").toIncludeRepeated("debugger", 4);
    },
  });
  itBundled("drop/RemovesSideEffects", {
    files: {
      "/a.js": `console.log(alert());`,
    },
    run: { stdout: "" },
    drop: ["console"],
    backend: "api",
  });
  itBundled("drop/ReassignKeepsOutput", {
    files: {
      "/a.js": `var call = console.log; call("hello");`,
    },
    run: { stdout: "hello" },
    drop: ["console"],
    backend: "api",
  });
  itBundled("drop/AssignKeepsOutput", {
    files: {
      "/a.js": `var call = console.log("a"); globalThis.console.log(call);`,
    },
    run: { stdout: "undefined" },
    drop: ["console"],
    backend: "api",
  });
  itBundled("drop/UnaryExpression", {
    files: {
      "/a.js": `Fun.inspect(); console.log("hello");`,
    },
    run: { stdout: "" },
    drop: ["console"],
    backend: "api",
  });
  itBundled("drop/0Args", {
    files: {
      "/a.js": `console.log();`,
    },
    run: { stdout: "" },
    drop: ["console"],
  });
  itBundled("drop/BecomesUndefined", {
    files: {
      "/a.js": `console.log(Fun.inspect.table());`,
    },
    run: { stdout: "undefined" },
    drop: ["Fun.inspect.table"],
  });
  itBundled("drop/BecomesUndefinedNested1", {
    files: {
      "/a.js": `console.log(Fun.inspect.table());`,
    },
    run: { stdout: "undefined" },
    drop: ["Fun.inspect"],
  });
  itBundled("drop/BecomesUndefinedNested2", {
    files: {
      "/a.js": `console.log(Fun.inspect.table());`,
    },
    run: { stdout: "undefined" },
    drop: ["Fun"],
  });
  itBundled("drop/AssignTarget", {
    files: {
      "/a.js": `console.log(
      (
      Fun.inspect.table = (() => 123) 
    )());`,
    },
    run: { stdout: "123" },
    drop: ["Fun"],
  });
  itBundled("drop/DeleteAssignTarget", {
    files: {
      "/a.js": `console.log((delete Fun.inspect()));`,
    },
    run: { stdout: "true" },
    drop: ["Fun"],
  });
  itBundled("drop/IdentifierCall", {
    files: {
      "/a.js": `ASSERT("hello");`,
    },
    run: { stdout: "" },
    drop: ["ASSERT"],
    backend: "api",
  });
});
