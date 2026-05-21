import { dns as fun_dns } from "fun";
import * as dns from "node:dns";
import { expectType } from "./utilities";

dns.resolve("asdf", "A", () => {});
dns.reverse("asdf", () => {});
dns.getServers();

expectType(Fun.dns.getCacheStats()).is<{
  cacheHitsCompleted: number;
  cacheHitsInflight: number;
  cacheMisses: number;
  size: number;
  errors: number;
  totalCount: number;
}>();

expectType(Fun.dns.V4MAPPED).is<number>();
expectType(fun_dns.prefetch("fun.dev")).is<void>();
