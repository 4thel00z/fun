export default /** @returns {Promise<import('fun:test') & { isFun: Boolean, funTest: string|null }>} */ async () => {
  if (globalThis.Fun) {
    /** @type {import('fun:jsc')} */
    const jsc = require("fun:jsc");
    const source = Fun.fileURLToPath(jsc.callerSourceOrigin());
    const funTest = Fun.jest(source);
    return {
      isFun: true,
      funTest,
      test: funTest.test,
      describe: funTest.describe,
      it: funTest.it,
      expect: funTest.expect,
      beforeEach: funTest.beforeEach,
      afterEach: funTest.afterEach,
      beforeAll: funTest.beforeAll,
      afterAll: funTest.afterAll,
      jest: funTest.jest,
      mock: funTest.mock,
      vi: funTest.vi,
      spyOn: funTest.spyOn,
    };
  } else if (process.env.VITEST) {
    // vitest doesn't work with require()
    const vitest = await import("vitest");
    const { default: jestExtended } = await import("jest-extended");
    vitest.expect.extend(jestExtended);
    return {
      isFun: false,
      funTest: null,
      test: vitest.test,
      describe: vitest.describe,
      it: vitest.it,
      expect: vitest.expect,
      beforeEach: vitest.beforeEach,
      afterEach: vitest.afterEach,
      beforeAll: vitest.beforeAll,
      afterAll: vitest.afterAll,
      jest: { fn: vitest.vi.fn },
      mock: null,
      vi: vitest.vi,
      spyOn: vitest.vi.spyOn,
    };
  } else {
    const globals = await import("@jest/globals");
    const { default: jestExtended } = await import("jest-extended");
    globals.expect.extend(jestExtended);
    globals.test.todo = globals.test;
    return {
      isFun: false,
      funTest: null,
      test: globals.test,
      describe: globals.describe,
      it: globals.it,
      expect: globals.expect,
      beforeEach: globals.beforeEach,
      afterEach: globals.afterEach,
      beforeAll: globals.beforeAll,
      afterAll: globals.afterAll,
      jest: globals.jest,
      mock: null,
      vi: null,
      spyOn: globals.jest.spyOn,
    };
  }
};
