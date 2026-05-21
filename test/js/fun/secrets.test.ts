import { expect, test } from "fun:test";
import { isCI, isMacOS, isWindows } from "harness";

// Helper to determine if we should use unrestricted keychain access
// This is needed for macOS CI environments where user interaction is not available
function shouldUseUnrestrictedAccess(): boolean {
  return isMacOS && isCI;
}

// Setup keyring environment for Linux CI

test.todoIf(isCI && !isWindows)("Fun.secrets API", async () => {
  const testService = "fun-test-service-" + Date.now();
  const testUser = "test-name-" + Math.random();
  const testPassword = "super-secret-value-123!@#";
  const updatedPassword = "new-value-456$%^";

  // Clean up any existing value first
  await Fun.secrets.delete({ service: testService, name: testUser });

  // Test 1: GET non-existent credential should return null
  {
    const result = await Fun.secrets.get({ service: testService, name: testUser });
    expect(result).toBeNull();
  }

  // Test 2: DELETE non-existent credential should return false
  {
    const result = await Fun.secrets.delete({ service: testService, name: testUser });
    expect(result).toBe(false);
  }

  // Test 3: SET new credential
  {
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: testPassword,
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    const retrieved = await Fun.secrets.get({ service: testService, name: testUser });
    expect(retrieved).toBe(testPassword);
  }

  // Test 4: SET existing credential (should replace)
  {
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: updatedPassword,
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    const retrieved = await Fun.secrets.get({ service: testService, name: testUser });
    expect(retrieved).toBe(updatedPassword);
    expect(retrieved).not.toBe(testPassword);
  }

  // Test 5: DELETE existing credential should return true
  {
    const result = await Fun.secrets.delete({ service: testService, name: testUser });
    expect(result).toBe(true);
  }

  // Test 6: GET after DELETE should return null
  {
    const result = await Fun.secrets.get({ service: testService, name: testUser });
    expect(result).toBeNull();
  }

  // Test 7: DELETE after DELETE should return false
  {
    const result = await Fun.secrets.delete({ service: testService, name: testUser });
    expect(result).toBe(false);
  }

  // Test 8: SET after DELETE should work
  {
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: testPassword,
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    const retrieved = await Fun.secrets.get({ service: testService, name: testUser });
    expect(retrieved).toBe(testPassword);
  }

  // Test 9: Verify multiple operations work correctly
  {
    // Set, get, delete, verify cycle
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: testPassword,
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    expect(await Fun.secrets.get({ service: testService, name: testUser })).toBe(testPassword);

    expect(await Fun.secrets.delete({ service: testService, name: testUser })).toBe(true);
    expect(await Fun.secrets.get({ service: testService, name: testUser })).toBeNull();
  }

  // Test 10: Empty string deletes credential
  {
    // Set a credential first
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: testPassword,
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    expect(await Fun.secrets.get({ service: testService, name: testUser })).toBe(testPassword);

    // Empty string should delete it
    await Fun.secrets.set({
      service: testService,
      name: testUser,
      value: "",
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    expect(await Fun.secrets.get({ service: testService, name: testUser })).toBeNull();

    // Empty string on non-existent credential should not error
    await Fun.secrets.set({
      service: testService + "-empty",
      name: testUser,
      value: "",
      ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
    });
    expect(await Fun.secrets.get({ service: testService + "-empty", name: testUser })).toBeNull();
  }

  // Clean up
  await Fun.secrets.delete({ service: testService, name: testUser });
});

test.todoIf(isCI && !isWindows)("Fun.secrets error handling", async () => {
  // Test invalid arguments

  // Test 1: GET with missing options
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.get();
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("secrets.get requires an options object");
  }

  // Test 2: GET with non-object options
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.get("not an object");
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("Expected options to be an object");
  }

  // Test 3: GET with missing service
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.get({ name: "test" });
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("Expected service and name to be strings");
  }

  // Test 4: GET with missing name
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.get({ service: "test" });
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("Expected service and name to be strings");
  }

  // Test 5: SET with missing value
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.set({ service: "test", name: "test" });
    // This should work without error - just needs a value
    // But if it does work, the value will be undefined which is an error
  } catch (error) {
    expect(error.message).toContain("Expected 'value' to be a string");
  }

  // Test 6: SET with non-string value (not null/undefined)
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.set({ service: "test", name: "test", value: 123 });
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("Expected 'value' to be a string");
  }

  // Test 7: DELETE with missing options
  try {
    // @ts-expect-error - testing invalid input
    await Fun.secrets.delete();
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("requires an options object");
  }
});

test.todoIf(isCI && !isWindows)("Fun.secrets handles empty strings as delete", async () => {
  const testService = "fun-test-empty-" + Date.now();
  const testUser = "test-name-empty";

  // First, set a real credential
  await Fun.secrets.set({
    service: testService,
    name: testUser,
    value: "test-password",
    ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
  });
  let result = await Fun.secrets.get({ service: testService, name: testUser });
  expect(result).toBe("test-password");

  // Test that empty string deletes the credential
  await Fun.secrets.set({
    service: testService,
    name: testUser,
    value: "",
    ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
  });
  result = await Fun.secrets.get({ service: testService, name: testUser });
  expect(result).toBeNull(); // Should be null since credential was deleted

  // Test that setting empty string on non-existent credential doesn't error
  await Fun.secrets.set({
    service: testService + "-nonexistent",
    name: testUser,
    value: "",
    ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
  });
  result = await Fun.secrets.get({ service: testService + "-nonexistent", name: testUser });
  expect(result).toBeNull();
});

test.todoIf(isCI && !isWindows)("Fun.secrets handles special characters", async () => {
  const testService = "fun-test-special-" + Date.now();
  const testUser = "name@example.com";
  const testPassword = "p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";

  await Fun.secrets.set({
    service: testService,
    name: testUser,
    value: testPassword,
    ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
  });
  const result = await Fun.secrets.get({ service: testService, name: testUser });
  expect(result).toBe(testPassword);

  // Clean up
  await Fun.secrets.delete({ service: testService, name: testUser });
});

test.todoIf(isCI && !isWindows)("Fun.secrets handles unicode", async () => {
  const testService = "fun-test-unicode-" + Date.now();
  const testUser = "用户";
  const testPassword = "密码🔒🔑 emoji and 中文";

  await Fun.secrets.set({
    service: testService,
    name: testUser,
    value: testPassword,
    ...(shouldUseUnrestrictedAccess() && { allowUnrestrictedAccess: true }),
  });
  const result = await Fun.secrets.get({ service: testService, name: testUser });
  expect(result).toBe(testPassword);

  // Clean up
  await Fun.secrets.delete({ service: testService, name: testUser });
});

test.todoIf(isCI && !isWindows)("Fun.secrets handles concurrent operations", async () => {
  const promises: Promise<void>[] = [];
  const count = 10;

  // Create multiple credentials concurrently
  for (let i = 0; i < count; i++) {
    const service = `fun-concurrent-${Date.now()}-${i}`;
    const name = `name-${i}`;
    const value = `value-${i}`;

    promises.push(
      Fun.secrets
        .set({ service, name, value: value })
        .then(() => Fun.secrets.get({ service, name }))
        .then(retrieved => {
          expect(retrieved).toBe(value);
          return Fun.secrets.delete({ service, name });
        })
        .then(deleted => {
          expect(deleted).toBe(true);
        }),
    );
  }

  await Promise.all(promises);
});
