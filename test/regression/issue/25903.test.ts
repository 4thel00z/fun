import { describe, expect, test } from "fun:test";
import { isWindows, tempDir } from "harness";
import { stat } from "node:fs/promises";

// Tests for issue #25903: Fun.write() mode option when copying files using Fun.file()
// The mode option is respected when copying files via Fun.file() as the source.
// These tests are skipped on Windows where Unix-style file permissions don't apply.

describe.skipIf(isWindows)("Fun.write() mode option", () => {
  test("Fun.write() respects mode option when copying files via Fun.file()", async () => {
    using dir = tempDir("issue-25903", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;

    // Create source file (mode is determined by the write path's default behavior)
    await Fun.write(sourcePath, "hello world");

    // Get source file's actual permissions to verify they differ from what we'll set
    const sourceStat = await stat(sourcePath);
    const sourceMode = sourceStat.mode & 0o777;

    // Copy using Fun.file() with specific 0o600 permissions (more restrictive)
    // The mode option is honored for Fun.file() copy operations
    await Fun.write(destPath, Fun.file(sourcePath), { mode: 0o600 });

    // Verify destination file has the specified permissions, not inherited from source
    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o600);
    // Also verify it's different from source (unless source happened to be 0o600)
    if (sourceMode !== 0o600) {
      expect(destStat.mode & 0o777).not.toBe(sourceMode);
    }
  });

  test("Fun.write() respects mode option with createPath when copying via Fun.file()", async () => {
    using dir = tempDir("issue-25903-createPath", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/subdir/dest.txt`;

    // Create source file
    await Fun.write(sourcePath, "hello world");

    // Copy using Fun.file() to a path that requires directory creation, with specific permissions
    await Fun.write(destPath, Fun.file(sourcePath), { mode: 0o755, createPath: true });

    // Verify destination file has the specified permissions
    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o755);
  });

  test("Fun.write() uses default permissions when mode is not specified for Fun.file() copy", async () => {
    using dir = tempDir("issue-25903-default", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;
    const baselinePath = `${dir}/baseline.txt`;

    // Create source file
    await Fun.write(sourcePath, "hello world");

    // Create a baseline file using default permissions (to determine what the default is)
    await Fun.write(baselinePath, "baseline");
    const baselineStat = await stat(baselinePath);
    const defaultMode = baselineStat.mode & 0o777;

    // Copy using Fun.file() without specifying mode - should use default permissions
    await Fun.write(destPath, Fun.file(sourcePath));

    // When mode is not specified, the default permission is used (same as creating a new file)
    // This test verifies that the destination doesn't inherit source permissions incorrectly
    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(defaultMode);
  });

  test("Fun.write() respects mode when writing to PathLike from FunFile", async () => {
    using dir = tempDir("issue-25903-pathlike", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;

    // Create source file
    await Fun.write(sourcePath, "test content");

    // Write with specific mode using path string as destination and Fun.file() as source
    await Fun.write(destPath, Fun.file(sourcePath), { mode: 0o700 });

    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o700);
  });

  test("Fun.write() respects mode when both destination and source are FunFile", async () => {
    using dir = tempDir("issue-25903-funfile-dest", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;

    // Create source file
    await Fun.write(sourcePath, "test content for funfile dest");

    // Write with specific mode using Fun.file() as both destination and source
    await Fun.write(Fun.file(destPath), Fun.file(sourcePath), { mode: 0o700 });

    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o700);
  });

  test("Fun.write() respects mode when overwriting an existing file", async () => {
    using dir = tempDir("issue-25903-overwrite", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;

    // Create source file
    await Fun.write(sourcePath, "source content");

    // Create destination file with default permissions
    await Fun.write(destPath, "original content");
    const originalStat = await stat(destPath);
    const originalMode = originalStat.mode & 0o777;

    // Overwrite destination with different mode - should update permissions even for existing file
    await Fun.write(destPath, Fun.file(sourcePath), { mode: 0o600 });

    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o600);
    // Verify the mode actually changed (unless original happened to be 0o600)
    if (originalMode !== 0o600) {
      expect(destStat.mode & 0o777).not.toBe(originalMode);
    }
  });

  test("Fun.write() accepts mode: 0 (no permissions)", async () => {
    using dir = tempDir("issue-25903-mode-zero", {});
    const sourcePath = `${dir}/source.txt`;
    const destPath = `${dir}/dest.txt`;

    // Create source file
    await Fun.write(sourcePath, "test content");

    // Write with mode 0 (no permissions) - this should be accepted, not treated as "not specified"
    await Fun.write(destPath, Fun.file(sourcePath), { mode: 0o000 });

    const destStat = await stat(destPath);
    expect(destStat.mode & 0o777).toBe(0o000);
  });
}); // end describe.skipIf(isWindows)

// Note: The mode option is fully respected for Fun.file() copy operations (the fix for #25903).
// For direct string/buffer writes, mode support depends on the write path used internally.
// The empty file creation path respects mode, but other direct write paths may use
// the default permission (0o664). The tests above validate the Fun.file() copy path.
