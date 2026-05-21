import { expectType } from "./utilities";

expectType(Fun.YAML.parse("")).is<unknown>();
// @ts-expect-error
expectType(Fun.YAML.parse({})).is<unknown>();
expectType(Fun.YAML.stringify({ abc: "def"})).is<string>();
// @ts-expect-error
expectType(Fun.YAML.stringify("hi", {})).is<string>();
// @ts-expect-error
expectType(Fun.YAML.stringify("hi", null, 123n)).is<string>();