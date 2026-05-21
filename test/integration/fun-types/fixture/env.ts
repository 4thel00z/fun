import { expectType } from "./utilities";

import { env as fun_env } from "fun";
import { env as node_env } from "node:process";

declare module "fun" {
  interface Env {
    FOO: "FOO";
  }
}
expectType(Fun.env.FOO).is<"FOO">();
expectType(process.env.FOO).is<"FOO">();
expectType(import.meta.env.FOO).is<"FOO">();
expectType(fun_env.FOO).is<"FOO">();
expectType(node_env.FOO).is<"FOO">();

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BAR: "BAR";
    }
  }
}
expectType(Fun.env.BAR).is<"BAR">();
expectType(process.env.BAR).is<"BAR">();
expectType(import.meta.env.BAR).is<"BAR">();
expectType(node_env.BAR).is<"BAR">();
expectType(fun_env.BAR).is<"BAR">();

declare global {
  interface ImportMetaEnv {
    BAZ: "BAZ";
  }
}
expectType(Fun.env.BAZ).is<"BAZ">();
// expectType(process.env.BAZ).is<"BAZ">(); // ProcessEnv does NOT extend ImportMetaEnv
expectType(import.meta.env.BAZ).is<"BAZ">();
// expectType(node_env.BAZ).is<"BAZ">(); // ProcessEnv does NOT extend ImportMetaEnv
expectType(fun_env.BAZ).is<"BAZ">();

expectType(Fun.env.OTHER).is<string | undefined>();
expectType(process.env.OTHER).is<string | undefined>();
expectType(import.meta.env.OTHER).is<string | undefined>();
expectType(node_env.OTHER).is<string | undefined>();
expectType(fun_env.OTHER).is<string | undefined>();

function isAllSame<T>(a: T, b: T, c: T, d: T, e: T) {
  return a === b && b === c && c === d && d === e;
}

//prettier-ignore
{

  isAllSame              <"FOO"> (process.env.FOO,   Fun.env.FOO,   import.meta.env.FOO,   node_env.FOO,   fun_env.FOO);
  isAllSame              <"BAR"> (process.env.BAR,   Fun.env.BAR,   import.meta.env.BAR,   node_env.BAR,   fun_env.BAR);
  isAllSame              <"BAZ"> (          "BAZ",   Fun.env.BAZ,   import.meta.env.BAZ,          "BAZ",   fun_env.BAZ); // ProcessEnv does NOT extend ImportMetaEnv
  isAllSame <string | undefined> (process.env.OTHER, Fun.env.OTHER, import.meta.env.OTHER, node_env.OTHER, fun_env.OTHER);

}
