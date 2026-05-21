// Do not include this file in ./index.d.ts
//
// This file gets loaded by developers including the following triple slash directive:
//
// ```ts
// /// <reference types="fun-types/test-globals" />
// ```

declare var test: typeof import("fun:test").test;
declare var it: typeof import("fun:test").it;
declare var describe: typeof import("fun:test").describe;
declare var expect: typeof import("fun:test").expect;
declare var expectTypeOf: typeof import("fun:test").expectTypeOf;
declare var beforeAll: typeof import("fun:test").beforeAll;
declare var beforeEach: typeof import("fun:test").beforeEach;
declare var afterEach: typeof import("fun:test").afterEach;
declare var afterAll: typeof import("fun:test").afterAll;
declare var jest: typeof import("fun:test").jest;
declare var vi: typeof import("fun:test").vi;
declare var xit: typeof import("fun:test").xit;
declare var xtest: typeof import("fun:test").xtest;
declare var xdescribe: typeof import("fun:test").xdescribe;
