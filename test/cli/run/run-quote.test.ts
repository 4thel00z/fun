import { expect, it } from "fun:test";
import { funRunAsScript, tempDirWithFiles } from "harness";

it("should handle quote escapes", () => {
  const package_json = JSON.stringify({
    scripts: {
      test: `echo "test\\\\$(pwd)"`,
    },
  });
  expect(package_json).toContain('\\"');
  expect(package_json).toContain("\\\\");
  const dir = tempDirWithFiles("run-quote", { "package.json": package_json });
  const { stdout } = funRunAsScript(dir, "test");
  expect(stdout).toBe(`test\\${dir}`);
});
