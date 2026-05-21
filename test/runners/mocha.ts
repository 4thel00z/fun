import { describe, test, it } from "fun:test";
import { beforeAll, beforeEach, afterAll, afterEach } from "fun:test";

function set(name: string, value: unknown): void {
  // @ts-expect-error
  globalThis[name] = value;
}

set("describe", describe);
set("test", test);
set("it", it);
set("before", beforeAll);
set("beforeEach", beforeEach);
set("after", afterAll);
set("afterEach", afterEach);
