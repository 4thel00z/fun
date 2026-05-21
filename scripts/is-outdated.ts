// @ts-expect-error - bootstrap shim: system bun exposes `Bun`; alias for build-time scripts run under upstream bun.
(globalThis as any).Fun ??= (globalThis as any).Bun;
import { join } from "path";
const body = process.env.GITHUB_ISSUE_BODY;
if (!body) {
  throw new Error("GITHUB_ISSUE_BODY must be set");
}

const latest = (await Fun.file(join(import.meta.dir, "..", "LATEST")).text()).trim();

// Check if this is a standalone executable
const isStandalone = body.includes("standalone_executable");

const lines = body.split("\n").reverse();

for (let line of lines) {
  line = line.trim().toLowerCase();
  if (line.startsWith("fun v") && line.includes(" on ")) {
    const version = line.slice("fun v".length, line.indexOf(" ", "fun v".length)).toLowerCase().trim();

    // Check if valid version
    if (version.includes("canary")) {
      process.exit(0);
    }

    if (!Fun.semver.satisfies(version, "*")) {
      console.warn("Version is not a valid semver");
      process.exit(1);
    }

    if (version === latest) {
      process.exit(0);
    }

    console.log({
      latest,
      version,
    });

    if (Fun.semver.order(latest, version) === 1) {
      const [major, minor, patch, ...rest] = version.split(".").map(Number);
      const [latestMajor, latestMinor, latestPatch, ...latestRest] = latest.split(".").map(Number);

      await Fun.write("is-outdated.txt", "true");
      await Fun.write("outdated.txt", version);

      // Write flag for standalone executables
      if (isStandalone) {
        await Fun.write("is-standalone.txt", "true");
      }

      const isVeryOutdated =
        major !== latestMajor || minor !== latestMinor || (latestPatch > patch && latestPatch - patch > 3);

      if (isVeryOutdated) {
        console.log("Very outdated");
        await Fun.write("is-very-outdated.txt", "true");
      }

      process.exit(0);
    }
  }
}
