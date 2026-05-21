import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pack, Unpack } from "tar";
import { bench, group, run } from "../runner.mjs";

// Check if Fun.Archive is available
const hasFunArchive = typeof Fun !== "undefined" && typeof Fun.Archive !== "undefined";

// Test data sizes
const smallContent = "Hello, World!";
const mediumContent = Buffer.alloc(10 * 1024, "x").toString(); // 10KB
const largeContent = Buffer.alloc(100 * 1024, "x").toString(); // 100KB

// Create test files for node-tar (it reads from filesystem)
const setupDir = mkdtempSync(join(tmpdir(), "archive-bench-setup-"));

function setupNodeTarFiles(prefix, files) {
  const dir = join(setupDir, prefix);
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    const fileDir = join(filePath, "..");
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, content);
  }
  return dir;
}

// Setup directories for different test cases
const smallFilesDir = setupNodeTarFiles("small", {
  "file1.txt": smallContent,
  "file2.txt": smallContent,
  "file3.txt": smallContent,
});

const mediumFilesDir = setupNodeTarFiles("medium", {
  "file1.txt": mediumContent,
  "file2.txt": mediumContent,
  "file3.txt": mediumContent,
});

const largeFilesDir = setupNodeTarFiles("large", {
  "file1.txt": largeContent,
  "file2.txt": largeContent,
  "file3.txt": largeContent,
});

const manyFilesEntries = {};
for (let i = 0; i < 100; i++) {
  manyFilesEntries[`file${i}.txt`] = smallContent;
}
const manyFilesDir = setupNodeTarFiles("many", manyFilesEntries);

// Pre-create archives for extraction benchmarks
let smallTarGzBuffer, mediumTarGzBuffer, largeTarGzBuffer, manyFilesTarGzBuffer;
let smallTarBuffer, mediumTarBuffer, largeTarBuffer, manyFilesTarBuffer;
let smallFunArchiveGz, mediumFunArchiveGz, largeFunArchiveGz, manyFilesFunArchiveGz;
let smallFunArchive, mediumFunArchive, largeFunArchive, manyFilesFunArchive;

// Create tar buffer using node-tar (with optional gzip)
async function createNodeTarBuffer(cwd, files, gzip = false) {
  return new Promise(resolve => {
    const pack = new Pack({ cwd, gzip });
    const bufs = [];
    pack.on("data", chunk => bufs.push(chunk));
    pack.on("end", () => resolve(Buffer.concat(bufs)));
    for (const file of files) {
      pack.add(file);
    }
    pack.end();
  });
}

// Extract tar buffer using node-tar
async function extractNodeTarBuffer(buffer, cwd) {
  return new Promise((resolve, reject) => {
    const unpack = new Unpack({ cwd });
    unpack.on("end", resolve);
    unpack.on("error", reject);
    unpack.end(buffer);
  });
}

// Initialize gzipped archives
smallTarGzBuffer = await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
mediumTarGzBuffer = await createNodeTarBuffer(mediumFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
largeTarGzBuffer = await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
manyFilesTarGzBuffer = await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), true);

// Initialize uncompressed archives
smallTarBuffer = await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
mediumTarBuffer = await createNodeTarBuffer(mediumFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
largeTarBuffer = await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
manyFilesTarBuffer = await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), false);

const smallFiles = { "file1.txt": smallContent, "file2.txt": smallContent, "file3.txt": smallContent };
const mediumFiles = { "file1.txt": mediumContent, "file2.txt": mediumContent, "file3.txt": mediumContent };
const largeFiles = { "file1.txt": largeContent, "file2.txt": largeContent, "file3.txt": largeContent };

if (hasFunArchive) {
  smallFunArchiveGz = await Fun.Archive.from(smallFiles).bytes("gzip");
  mediumFunArchiveGz = await Fun.Archive.from(mediumFiles).bytes("gzip");
  largeFunArchiveGz = await Fun.Archive.from(largeFiles).bytes("gzip");
  manyFilesFunArchiveGz = await Fun.Archive.from(manyFilesEntries).bytes("gzip");

  smallFunArchive = await Fun.Archive.from(smallFiles).bytes();
  mediumFunArchive = await Fun.Archive.from(mediumFiles).bytes();
  largeFunArchive = await Fun.Archive.from(largeFiles).bytes();
  manyFilesFunArchive = await Fun.Archive.from(manyFilesEntries).bytes();
}

// Create reusable extraction directories (overwriting is fine)
const extractDirNodeTar = mkdtempSync(join(tmpdir(), "archive-bench-extract-node-"));
const extractDirFun = mkdtempSync(join(tmpdir(), "archive-bench-extract-fun-"));
const writeDirNodeTar = mkdtempSync(join(tmpdir(), "archive-bench-write-node-"));
const writeDirFun = mkdtempSync(join(tmpdir(), "archive-bench-write-fun-"));

// ============================================================================
// Create .tar (uncompressed) benchmarks
// ============================================================================

group("create .tar (3 small files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(smallFiles).bytes();
    });
  }
});

group("create .tar (3 x 100KB files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(largeFiles).bytes();
    });
  }
});

group("create .tar (100 small files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), false);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(manyFilesEntries).bytes();
    });
  }
});

// ============================================================================
// Create .tar.gz (compressed) benchmarks
// ============================================================================

group("create .tar.gz (3 small files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(smallFiles).bytes("gzip");
    });
  }
});

group("create .tar.gz (3 x 100KB files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(largeFiles).bytes("gzip");
    });
  }
});

group("create .tar.gz (100 small files)", () => {
  bench("node-tar", async () => {
    await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), true);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(manyFilesEntries).bytes("gzip");
    });
  }
});

// ============================================================================
// Extract .tar (uncompressed) benchmarks
// ============================================================================

group("extract .tar (3 small files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(smallTarBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(smallFunArchive).extract(extractDirFun);
    });
  }
});

group("extract .tar (3 x 100KB files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(largeTarBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(largeFunArchive).extract(extractDirFun);
    });
  }
});

group("extract .tar (100 small files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(manyFilesTarBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(manyFilesFunArchive).extract(extractDirFun);
    });
  }
});

// ============================================================================
// Extract .tar.gz (compressed) benchmarks
// ============================================================================

group("extract .tar.gz (3 small files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(smallTarGzBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(smallFunArchiveGz).extract(extractDirFun);
    });
  }
});

group("extract .tar.gz (3 x 100KB files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(largeTarGzBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(largeFunArchiveGz).extract(extractDirFun);
    });
  }
});

group("extract .tar.gz (100 small files)", () => {
  bench("node-tar", async () => {
    await extractNodeTarBuffer(manyFilesTarGzBuffer, extractDirNodeTar);
  });

  if (hasFunArchive) {
    bench("Fun.Archive", async () => {
      await Fun.Archive.from(manyFilesFunArchiveGz).extract(extractDirFun);
    });
  }
});

// ============================================================================
// Write .tar to disk benchmarks
// ============================================================================

let writeCounter = 0;

group("write .tar to disk (3 small files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar`), smallFiles);
    });
  }
});

group("write .tar to disk (3 x 100KB files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], false);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar`), largeFiles);
    });
  }
});

group("write .tar to disk (100 small files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), false);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar`), manyFilesEntries);
    });
  }
});

// ============================================================================
// Write .tar.gz to disk benchmarks
// ============================================================================

group("write .tar.gz to disk (3 small files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(smallFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar.gz`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar.gz`), smallFiles, "gzip");
    });
  }
});

group("write .tar.gz to disk (3 x 100KB files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(largeFilesDir, ["file1.txt", "file2.txt", "file3.txt"], true);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar.gz`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar.gz`), largeFiles, "gzip");
    });
  }
});

group("write .tar.gz to disk (100 small files)", () => {
  bench("node-tar + writeFileSync", async () => {
    const buffer = await createNodeTarBuffer(manyFilesDir, Object.keys(manyFilesEntries), true);
    writeFileSync(join(writeDirNodeTar, `archive-${writeCounter++}.tar.gz`), buffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.write", async () => {
      await Fun.Archive.write(join(writeDirFun, `archive-${writeCounter++}.tar.gz`), manyFilesEntries, "gzip");
    });
  }
});

// ============================================================================
// Get files array from archive (files() method) benchmarks
// ============================================================================

// Helper to get files array from node-tar (reads all entries into memory)
async function getFilesArrayNodeTar(buffer) {
  return new Promise((resolve, reject) => {
    const files = new Map();
    let pending = 0;
    let closed = false;

    const maybeResolve = () => {
      if (closed && pending === 0) {
        resolve(files);
      }
    };

    const unpack = new Unpack({
      onReadEntry: entry => {
        if (entry.type === "File") {
          pending++;
          const chunks = [];
          entry.on("data", chunk => chunks.push(chunk));
          entry.on("end", () => {
            const content = Buffer.concat(chunks);
            // Create a File-like object similar to Fun.Archive.files()
            files.set(entry.path, new Blob([content]));
            pending--;
            maybeResolve();
          });
        }
        entry.resume(); // Drain the entry
      },
    });
    unpack.on("close", () => {
      closed = true;
      maybeResolve();
    });
    unpack.on("error", reject);
    unpack.end(buffer);
  });
}

group("files() - get all files as Map (3 small files)", () => {
  bench("node-tar", async () => {
    await getFilesArrayNodeTar(smallTarBuffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.files()", async () => {
      await Fun.Archive.from(smallFunArchive).files();
    });
  }
});

group("files() - get all files as Map (3 x 100KB files)", () => {
  bench("node-tar", async () => {
    await getFilesArrayNodeTar(largeTarBuffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.files()", async () => {
      await Fun.Archive.from(largeFunArchive).files();
    });
  }
});

group("files() - get all files as Map (100 small files)", () => {
  bench("node-tar", async () => {
    await getFilesArrayNodeTar(manyFilesTarBuffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.files()", async () => {
      await Fun.Archive.from(manyFilesFunArchive).files();
    });
  }
});

group("files() - get all files as Map from .tar.gz (3 small files)", () => {
  bench("node-tar", async () => {
    await getFilesArrayNodeTar(smallTarGzBuffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.files()", async () => {
      await Fun.Archive.from(smallFunArchiveGz).files();
    });
  }
});

group("files() - get all files as Map from .tar.gz (100 small files)", () => {
  bench("node-tar", async () => {
    await getFilesArrayNodeTar(manyFilesTarGzBuffer);
  });

  if (hasFunArchive) {
    bench("Fun.Archive.files()", async () => {
      await Fun.Archive.from(manyFilesFunArchiveGz).files();
    });
  }
});

await run();

// Cleanup
rmSync(setupDir, { recursive: true, force: true });
rmSync(extractDirNodeTar, { recursive: true, force: true });
rmSync(extractDirFun, { recursive: true, force: true });
rmSync(writeDirNodeTar, { recursive: true, force: true });
rmSync(writeDirFun, { recursive: true, force: true });
