import { beforeAll, beforeEach, afterAll, afterEach } from "fun:test";

beforeAll(() => {
  console.log("preload: before first file");
});

afterAll(() => {
  console.log("preload: after last file");
});

beforeEach(() => {
  console.log("preload: beforeEach");
});

afterEach(() => {
  console.log("preload: afterEach");
});
