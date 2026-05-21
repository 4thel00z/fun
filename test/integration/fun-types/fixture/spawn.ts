import type {
  FileSink,
  NullSubprocess,
  PipedSubprocess,
  ReadableSubprocess,
  SyncSubprocess,
  WritableSubprocess,
} from "fun";
import * as tsd from "./utilities";

Fun.spawn(["echo", "hello"]);

function depromise<T>(_promise: Promise<T>): T {
  return "asdf" as any as T;
}

{
  // Test cases for https://github.com/underdoc-org/fun/issues/17274

  {
    const proc = Fun.spawn(["cat"], {
      stdin: "pipe",
    });

    proc.stdin.write("hello");
  }

  {
    const proc = Fun.spawn(["cat"], {
      stdin: "pipe",
      onExit(proc, exitCode, signalCode, error) {
        tsd.expectType(proc).is<Fun.Subprocess<"pipe", "pipe", "inherit">>();
        console.log(`Process exited: ${exitCode}`);
      },
    });

    proc.stdin.write("hello");
  }
}

{
  const proc = Fun.spawn(["echo", "hello"], {
    cwd: "./path/to/subdir", // specify a working direcory
    env: { ...process.env, FOO: "bar" }, // specify environment variables
    onExit(proc, exitCode, signalCode, error) {
      // exit handler
    },
  });

  tsd.expectType(proc.pid).is<number>();

  tsd.expectType(proc.stdout).is<ReadableStream<Uint8Array<ArrayBuffer>>>();
  tsd.expectType(proc.stderr).is<undefined>();
  tsd.expectType(proc.stdin).is<undefined>();
}

{
  const proc = Fun.spawn(["cat"], {
    stdin: depromise(fetch("https://raw.githubusercontent.com/underdoc-org/fun/main/examples/hashing.js")),
  });

  const text = depromise(proc.stdout.text());
  console.log(text); // "const input = "hello world".repeat(400); ..."
}

{
  const proc = Fun.spawn(["cat"], {
    stdio: ["pipe", "pipe", "pipe", Fun.file("build.zip")],
  });

  tsd.expectType(proc.stdio[0]).is<null>();
  tsd.expectType(proc.stdio[1]).is<null>();
  tsd.expectType(proc.stdio[2]).is<null>();
  tsd.expectType(proc.stdio[3]).is<number | null | undefined>();

  tsd.expectType(proc.stdin).is<FileSink>();
  tsd.expectType(proc.stdout).is<ReadableStream<Uint8Array<ArrayBuffer>>>();
  tsd.expectType(proc.stderr).is<ReadableStream<Uint8Array<ArrayBuffer>>>();
}

{
  const proc = Fun.spawn(["cat"], {
    stdin: "pipe", // return a FileSink for writing
  });

  // enqueue string data
  proc.stdin.write("hello");

  // enqueue binary data
  const enc = new TextEncoder();
  proc.stdin.write(enc.encode(" world!"));
  enc.encodeInto(" world!", {} as any as Uint8Array);
  // Fun-specific overloads
  // these fail when lib.dom.d.ts is present
  enc.encodeInto(" world!", new Uint32Array(124));
  enc.encodeInto(" world!", {} as any as DataView);

  // send buffered data
  await proc.stdin.flush();

  // close the input stream
  await proc.stdin.end();
}

{
  const proc = Fun.spawn(["echo", "hello"]);
  const text = depromise(proc.stdout.text());
  console.log(text); // => "hello"
}

{
  const proc = Fun.spawn(["echo", "hello"], {
    onExit(proc, exitCode, signalCode, error) {
      // exit handler
    },
  });

  await proc.exited; // resolves when process exit
  proc.killed; // boolean — was the process killed?
  proc.exitCode; // null | number
  proc.signalCode; // null | "SIGABRT" | "SIGALRM" | ...
  proc.kill();
  proc.killed; // true

  proc.kill(); // specify an exit code
  proc.unref();
}

{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  tsd.expectType<FileSink>(proc.stdin);
  tsd.expectType<ReadableStream<Uint8Array>>(proc.stdout);
  tsd.expectType<ReadableStream<Uint8Array>>(proc.stderr);
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  tsd.expectType<undefined>(proc.stdin);
  tsd.expectType<undefined>(proc.stdout);
  tsd.expectType<undefined>(proc.stderr);
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  tsd.expectType<undefined>(proc.stdin);
  tsd.expectType<undefined>(proc.stdout);
  tsd.expectType<undefined>(proc.stderr);
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: [null, null, null],
  });

  tsd.expectType(proc.stdin).is<undefined>();
  tsd.expectType(proc.stdout).is<undefined>();
  tsd.expectType(proc.stderr).is<undefined>();
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: [new Request("1"), null, null],
  });

  tsd.expectType<number>(proc.stdin);
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: [new Response("1"), null, null],
  });
  tsd.expectType<number>(proc.stdin);
}
{
  const proc = Fun.spawn(["echo", "hello"], {
    stdio: [new Uint8Array([]), null, null],
  });
  tsd.expectType<number>(proc.stdin);
}
tsd.expectAssignable<PipedSubprocess>(Fun.spawn([], { stdio: ["pipe", "pipe", "pipe"] }));
tsd.expectAssignable<ReadableSubprocess>(Fun.spawn([], { stdio: ["ignore", "pipe", "pipe"] }));
tsd.expectAssignable<ReadableSubprocess>(Fun.spawn([], { stdio: ["pipe", "pipe", "pipe"] }));
tsd.expectAssignable<WritableSubprocess>(Fun.spawn([], { stdio: ["pipe", "pipe", "pipe"] }));
tsd.expectAssignable<WritableSubprocess>(Fun.spawn([], { stdio: ["pipe", "ignore", "inherit"] }));
tsd.expectAssignable<NullSubprocess>(Fun.spawn([], { stdio: ["ignore", "inherit", "ignore"] }));
tsd.expectAssignable<NullSubprocess>(Fun.spawn([], { stdio: [null, null, null] }));

tsd.expectAssignable<SyncSubprocess<Fun.SpawnOptions.Readable, Fun.SpawnOptions.Readable>>(Fun.spawnSync([], {}));

// Lazy option types (async only)
{
  // valid: lazy usable with async spawn
  const p1 = Fun.spawn(["echo", "hello"], {
    stdout: "pipe",
    stderr: "pipe",
    lazy: true,
  });
  tsd.expectType(p1.stdout).is<ReadableStream<Uint8Array<ArrayBuffer>>>();
}

{
  // valid: lazy false is also allowed
  const p2 = Fun.spawn(["echo", "hello"], {
    stdout: "pipe",
    stderr: "pipe",
    lazy: false,
  });
  tsd.expectType(p2.stderr).is<ReadableStream<Uint8Array<ArrayBuffer>>>();
}

{
  // invalid: lazy is not supported in spawnSync
  Fun.spawnSync(["echo", "hello"], {
    stdout: "pipe",
    stderr: "pipe",
    // @ts-expect-error lazy applies only to async spawn
    lazy: true,
  });
}

{
  // invalid: lazy is not supported in spawnSync (object overload)
  // prettier-ignore
  // @ts-expect-error lazy applies to async spawn
  Fun.spawnSync({ cmd: ["echo", "hello"], stdout: "pipe", stderr: "pipe", lazy: true,
  });
}
