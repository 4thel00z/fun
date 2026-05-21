import { TOML } from "fun";
import data from "./funfig.toml";
import { expectType } from "./utilities";

expectType<any>(data);
expectType(Fun.TOML.parse(data)).is<object>();
expectType(TOML.parse(data)).is<object>();
