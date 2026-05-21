import { debug } from "./console";
import { exists, read } from "./fs";
import { spawn } from "./spawn";

export const os = process.platform;

export const arch = os === "darwin" && process.arch === "x64" && isRosetta2() ? "arm64" : process.arch;

export const avx2 =
  arch === "x64" &&
  ((os === "linux" && isLinuxAVX2()) || (os === "darwin" && isDarwinAVX2()) || (os === "win32" && isWindowsAVX2()));

export const abi = os === "android" ? "android" : os === "linux" && isLinuxMusl() ? "musl" : undefined;

export type Platform = {
  os: string;
  arch: string;
  abi?: "musl" | "android";
  avx2?: boolean;
  bin: string;
  exe: string;
};

export const platforms: Platform[] = [
  {
    os: "darwin",
    arch: "arm64",
    bin: "fun-darwin-aarch64",
    exe: "bin/fun",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: true,
    bin: "fun-darwin-x64",
    exe: "bin/fun",
  },
  {
    os: "darwin",
    arch: "x64",
    bin: "fun-darwin-x64-baseline",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "arm64",
    bin: "fun-linux-aarch64",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "x64",
    avx2: true,
    bin: "fun-linux-x64",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "x64",
    bin: "fun-linux-x64-baseline",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "arm64",
    abi: "musl",
    bin: "fun-linux-aarch64-musl",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    avx2: true,
    bin: "fun-linux-x64-musl",
    exe: "bin/fun",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    bin: "fun-linux-x64-musl-baseline",
    exe: "bin/fun",
  },
  {
    // Node's process.platform is "android" on Android (Termux etc.), not "linux".
    // The release asset is still named fun-linux-* for consistency with the
    // build triplet, but npm's os field must be "android" for optionalDependency
    // resolution to pick it up on-device.
    os: "android",
    arch: "arm64",
    abi: "android",
    bin: "fun-linux-aarch64-android",
    exe: "bin/fun",
  },
  {
    os: "android",
    arch: "x64",
    abi: "android",
    bin: "fun-linux-x64-android",
    exe: "bin/fun",
  },
  {
    os: "freebsd",
    arch: "arm64",
    bin: "fun-freebsd-aarch64",
    exe: "bin/fun",
  },
  {
    os: "freebsd",
    arch: "x64",
    bin: "fun-freebsd-x64",
    exe: "bin/fun",
  },
  {
    os: "win32",
    arch: "x64",
    avx2: true,
    bin: "fun-windows-x64",
    exe: "bin/fun.exe",
  },
  {
    os: "win32",
    arch: "x64",
    bin: "fun-windows-x64-baseline",
    exe: "bin/fun.exe",
  },
  {
    os: "win32",
    arch: "arm64",
    bin: "fun-windows-aarch64",
    exe: "bin/fun.exe",
  },
];

export const supportedPlatforms: Platform[] = platforms
  .filter(
    platform =>
      platform.os === os &&
      platform.arch === arch &&
      (!platform.avx2 || avx2) &&
      (!platform.abi || abi === platform.abi),
  )
  .sort((a, b) => (a.avx2 === b.avx2 ? 0 : a.avx2 ? -1 : 1));

function isLinuxMusl(): boolean {
  try {
    return exists("/etc/alpine-release");
  } catch (error) {
    debug("isLinuxMusl failed", error);
    return false;
  }
}

function isLinuxAVX2(): boolean {
  try {
    return read("/proc/cpuinfo").includes("avx2");
  } catch (error) {
    debug("isLinuxAVX2 failed", error);
    return false;
  }
}

function isDarwinAVX2(): boolean {
  try {
    const { exitCode, stdout } = spawn("sysctl", ["-n", "machdep.cpu"]);
    return exitCode === 0 && stdout.includes("AVX2");
  } catch (error) {
    debug("isDarwinAVX2 failed", error);
    return false;
  }
}

function isRosetta2(): boolean {
  try {
    const { exitCode, stdout } = spawn("sysctl", ["-n", "sysctl.proc_translated"]);
    return exitCode === 0 && stdout.includes("1");
  } catch (error) {
    debug("isRosetta2 failed", error);
    return false;
  }
}

function isWindowsAVX2(): boolean {
  try {
    return (
      spawn("powershell", [
        "-c",
        `(Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);' -Name 'Kernel32' -Namespace 'Win32' -PassThru)::IsProcessorFeaturePresent(40);`,
      ]).stdout.trim() === "True"
    );
  } catch (error) {
    debug("isWindowsAVX2 failed", error);
    return false;
  }
}
