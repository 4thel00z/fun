import { Database } from "fun:sqlite";
import { describe, expect } from "fun:test";
import { itBundled } from "./expectBundled";

describe("bundler", () => {
  // https://github.com/underdoc-org/fun/issues/18899
  itBundled("fun/import-fun-format-cjs", {
    target: "fun",
    format: "cjs",
    bytecode: true,
    outdir: "/out",
    files: {
      "/entry.ts": /* js */ `
        import {RedisClient} from 'fun';
        import * as FunStar from 'fun';
        const funRequire = require("fun");
        if (RedisClient.name !== "RedisClient") {
          throw new Error("RedisClient.name is not RedisClient");
        }
        if (FunStar.RedisClient.name !== "RedisClient") {
          throw new Error("FunStar.RedisClient.name is not RedisClient");
        }
        if (funRequire.RedisClient.name !== "RedisClient") {
          throw new Error("funRequire.RedisClient.name is not RedisClient");
        }

        console.log(RedisClient.name);
        console.log(FunStar.RedisClient.name);
        console.log(funRequire.RedisClient.name);

        export class RedisCache {
          constructor(config: any) {
            this.connectServer(config);
          }
          
        }
      `,
    },
    run: { stdout: "RedisClient\nRedisClient\nRedisClient\n" },
  });
  itBundled("fun/embedded-sqlite-file", {
    target: "fun",
    outfile: "",
    outdir: "/out",
    files: {
      "/entry.ts": /* js */ `
        import db from './db.sqlite' with {type: "sqlite", embed: "true"};
        console.log(db.query("select message from messages LIMIT 1").get().message);
      `,
      "/db.sqlite": (() => {
        const db = new Database(":memory:");
        db.exec("create table messages (message text)");
        db.exec("insert into messages values ('Hello, world!')");
        return db.serialize();
      })(),
    },
    run: { stdout: "Hello, world!" },
  });
  itBundled("fun/sqlite-file", {
    target: "fun",
    files: {
      "/entry.ts": /* js */ `
        import db from './db.sqlite' with {type: "sqlite"};
        console.log(db.query("select message from messages LIMIT 1").get().message);
      `,
    },
    runtimeFiles: {
      "/db.sqlite": (() => {
        const db = new Database(":memory:");
        db.exec("create table messages (message text)");
        db.exec("insert into messages values ('Hello, world!')");
        return db.serialize();
      })(),
    },
    run: { stdout: "Hello, world!", setCwd: true },
  });
  itBundled("fun/TargetFunNoSourcemapMessage", {
    target: "fun",
    files: {
      "/entry.ts": /* js */ `
        // this file has comments and weird whitespace, intentionally
        // to make it obvious if sourcemaps were generated and mapped properly
        if           (true) code();
        function code() {
          // hello world
                  throw new
            Error("Hello World");
        }
      `,
    },
    run: {
      exitCode: 1,
      validate({ stderr }) {
        expect(stderr).toInclude("\nnote: missing sourcemaps for ");
        expect(stderr).toInclude("\nnote: consider bundling with '--sourcemap' to get unminified traces\n");
      },
    },
  });
  itBundled("fun/TargetFunSourcemapInline", {
    target: "fun",
    files: {
      "/entry.ts": /* js */ `
        // this file has comments and weird whitespace, intentionally
        // to make it obvious if sourcemaps were generated and mapped properly
        if           (true) code();
        function code() {
          // hello world
                  throw   new
            Error("Hello World");
        }
      `,
    },
    sourceMap: "inline",
    run: {
      exitCode: 1,
      validate({ stderr }) {
        expect(stderr).toStartWith(
          `1 | // this file has comments and weird whitespace, intentionally
2 | // to make it obvious if sourcemaps were generated and mapped properly
3 | if           (true) code();
4 | function code() {
5 |   // hello world
6 |           throw   new
                      ^
error: Hello World`,
        );
        expect(stderr).toInclude("entry.ts:6:19");
      },
    },
  });
  itBundled("fun/unicode comment", {
    target: "fun",
    files: {
      "/a.ts": /* js */ `
        /* æ */
      `,
    },
    run: { stdout: "" },
  });
  if (Fun.version.startsWith("1.3") || Fun.version.startsWith("1.2")) {
    for (const backend of ["api", "cli"] as const) {
      itBundled("fun/ExportsConditionsDevelopment" + backend.toUpperCase(), {
        files: {
          "src/entry.js": `import 'pkg1'`,
          "node_modules/pkg1/package.json": /* json */ `
        {
          "exports": {
            "development": "./custom1.js",
            "default": "./default.js"
          }
        }
      `,
          "node_modules/pkg1/custom1.js": `console.log('SUCCESS')`,
          "node_modules/pkg1/default.js": `console.log('FAIL')`,
        },
        backend,
        outfile: "out.js",
        define: { "process.env.NODE_ENV": '"development"' },
        run: {
          stdout: "SUCCESS",
        },
      });
      itBundled("fun/ExportsConditionsDevelopmentInProduction" + backend.toUpperCase(), {
        files: {
          "src/entry.js": `import 'pkg1'`,
          "node_modules/pkg1/package.json": /* json */ `
        {
          "exports": {
            "development": "./custom1.js",
            "default": "./default.js"
          }
        }
      `,
          "node_modules/pkg1/custom1.js": `console.log('FAIL')`,
          "node_modules/pkg1/default.js": `console.log('SUCCESS')`,
        },
        backend,
        outfile: "/Users/user/project/out.js",
        define: { "process.env.NODE_ENV": '"production"' },
        run: {
          stdout: "SUCCESS",
        },
      });
    }
  }
});
