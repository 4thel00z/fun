import { runSecurityScannerTests } from "./fun-security-scanner-matrix-runner";

// See ./fun-security-scanner-matrix-with-node-modules.test.ts
// for notes on what this is and why it exists
runSecurityScannerTests(import.meta.path, false);
