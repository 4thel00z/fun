import fact from "./file.json";
console.log(fact);

import * as test from "fun:test";
test.describe;
test.it;

const options: Fun.TLSOptions = {
  keyFile: "",
};

process.assert;

const error = new Error("hello world");
const clone = structuredClone(error);
console.log(clone.message); // "hello world"

new SubtleCrypto();
declare const mySubtleCrypto: SubtleCrypto;

new CryptoKey();
declare const myCryptoKey: CryptoKey;

import * as sqlite from "fun:sqlite";
sqlite.Database;

Fun satisfies typeof import("fun");
expectType(Fun).is<typeof import("fun")>();
expectType<typeof import("fun")>().is<typeof Fun>();

type ConstructorOf<T> = new (...args: any[]) => T;

import * as NodeTLS from "node:tls";
import * as TLS from "tls";

process.revision;

NodeTLS satisfies typeof TLS;
TLS satisfies typeof NodeTLS;

type NodeTLSOverrideTest = NodeTLS.FunConnectionOptions;
type TLSOverrideTest = TLS.FunConnectionOptions;

WebAssembly.Global;
WebAssembly.Memory;
WebAssembly.compile;
WebAssembly.compileStreaming;
WebAssembly.instantiate;
WebAssembly.instantiateStreaming;
WebAssembly.validate;

WebAssembly.Global satisfies ConstructorOf<Fun.WebAssembly.Global>;
WebAssembly.Memory satisfies ConstructorOf<Fun.WebAssembly.Memory>;

type wasmglobalthing = Fun.WebAssembly.Global;

type S3OptionsFromNamespace = Fun.S3Options;
type S3OptionsFromImport = import("fun").S3Options;

type c = import("fun").S3Client;

Fun.s3.file("").name;

const client = new Fun.S3Client({
  secretAccessKey: "",
});

new TextEncoder();

client.file("");

Fun.fetch;

// just some APIs
new Request("url");
new Response();
new Headers();
new URL("");
new URLSearchParams([["cool", "stuff"]]);
new File([], "filename", { type: "text/plain" });
new Blob([], { type: "text/plain" });
new ReadableStream();
new WritableStream();
new TransformStream();
new AbortSignal();
new AbortController();
AbortSignal.timeout(200);
AbortSignal.any([new AbortSignal()]);
AbortSignal.abort(200);

new TextDecoder();
new TextEncoder();

fetch("url", {
  proxy: "",
});

fetch(new URL("url"), {
  proxy: "",
});

Fun.fetch(new URL("url"), {
  proxy: "",
});

Fun.S3Client;

Fun.$`hey`;

type b = Fun.$.ShellPromise;

const myShellPromise: Fun.$.ShellPromise = Fun.$`hey`;
const myShellError: Fun.$.ShellError = new Fun.$.ShellError();

expectType(myShellPromise).is<Fun.$.ShellPromise>();
expectType(myShellError).is<Fun.$.ShellError>();

const myShellConstructor: typeof Fun.$.Shell = Fun.$.Shell;
const myShellPromiseConstructor: typeof Fun.$.ShellPromise = Fun.$.ShellPromise;
const myShellErrorConstructor: typeof Fun.$.ShellError = Fun.$.ShellError;

expectType(myShellConstructor).is<typeof Fun.$.Shell>();
expectType(myShellPromiseConstructor).is<typeof Fun.$.ShellPromise>();
expectType(myShellErrorConstructor).is<typeof Fun.$.ShellError>();

const myShellInstance: Fun.$ = new Fun.$.Shell();
await myShellInstance`hey`;

expectType(Fun.$).is<Fun.$>();

const myOtherShell = Fun.$.nothrow();
expectType(myOtherShell).is<Fun.$>();

expectType(myShellInstance).is<typeof Fun.$>();

await Fun.$.nothrow().throws(false).env({ TEST: "cool" }).cwd("/")`exit 0`;
await myShellInstance.nothrow().throws(false).env({ TEST: "cool" }).cwd("/")`exit 0`;

Fun.$;

declare const e: unknown;
if (e instanceof Fun.$.ShellError) {
  expectType(e.exitCode).is<number>();
  expectType(e.stderr).is<Buffer>();
  expectType(e.stdout).is<Buffer>();
}

new Promise(resolve => {
  resolve(1);
});

import.meta.hot.on("fun:fun:beforeFullReloadBut also allows anything", () => {
  //
});

new Map();
new Set();
new WeakMap();
new WeakSet();
new Map();
new Set();
new WeakMap();

Promise.try(() => {
  return 1;
});

Promise.try(() => {
  throw new Error("test");
});

Promise.try((message: string) => {
  throw new Error(message);
}, "Fun");

declare const myReadableStream: ReadableStream<string>;
for await (const chunk of myReadableStream) {
  console.log(chunk);
  expectType(chunk).is<string>();
}

for await (const chunk of Fun.stdin.stream()) {
  // chunk is Uint8Array
  // this converts it to text (assumes ASCII encoding)
  const chunkText = Buffer.from(chunk).toString();
  console.log(`Chunk: ${chunkText}`);
  expectType(chunk).is<Uint8Array<ArrayBuffer>>();
  expectType(chunkText).is<string>();
}

const myAsyncGenerator = async function* () {
  yield new Uint8Array([1, 2, 3]);
  yield new Uint8Array([4, 5, 6]);
};

new Response(myAsyncGenerator());

const statuses = [200, 400, 401, 403, 404, 500, 501, 502, 503, 504];

const r = new Request("", {
  body: "",
});

await fetch(r);
await fetch("", {
  tls: {
    key: Fun.file("key.pem"),
    cert: Fun.file("cert.pem"),
    ca: [Fun.file("ca.pem")],
    rejectUnauthorized: false,
  },
});

r.method;
r.body;
r.headers.get("content-type");

new Request("", {});
new Fun.$.ShellError() instanceof Fun.$.ShellError;

await r.json();
await r.text();

declare const headers: Headers;
headers.toJSON();

const req1 = new Request("", {
  body: "",
});

for (const header of new Headers()) {
  console.log(header);
}

fetch("", {
  tls: {
    rejectUnauthorized: false,
    checkServerIdentity: () => {
      return undefined;
    },
  },
});

req1.body;
req1.json();
req1.formData();
req1.arrayBuffer();
req1.blob();
req1.text();
req1.arrayBuffer();
req1.blob();

req1.headers;
req1.headers.toJSON();

new ReadableStream({});

const body = await fetch(req1);

Fun.fetch satisfies typeof fetch;
Fun.fetch.preconnect satisfies typeof fetch.preconnect;

await body.text();

fetch;

fetch.preconnect(new URL(""));

Fun.serve({
  port: 3000,
  fetch: () => new Response("ok"),

  tls: {
    key: Fun.file(""), // do this!
    cert: Fun.file(""), // do this!
  },
});

import type { BinaryLike } from "node:crypto";
declare function asIs(value: BinaryLike): BinaryLike;
asIs(Buffer.from("Hey", "utf-8"));

new URL("", "");
const myUrl: URL = new URL("");
URL.canParse;
URL.createObjectURL;
URL.revokeObjectURL;

declare const myBodyInit: Fun.BodyInit;
declare const myHeadersInit: Fun.HeadersInit;

await new Blob().text();
await new Blob().json();
await new Blob().arrayBuffer();
await new Blob().bytes();
await new Blob().formData();

await new File(["code"], "name.ts").text();
await new File(["code"], "name.ts").json();
await new File(["code"], "name.ts").arrayBuffer();
await new File(["code"], "name.ts").bytes();
await new File(["code"], "name.ts").formData();

await Fun.file("test").text();
await Fun.file("test").json();
await Fun.file("test").arrayBuffer();
await Fun.file("test").bytes();
await Fun.file("test").formData();

new MessagePort();

new File(["code"], "name.ts");

URL.parse("fun.dev");
URL.parse("fun.dev", "fun.dev");
Error.isError(new Error());

Response.json("");
Response.redirect("fun.dev", 300);
Response.error();
Response.redirect("fun.dev", 302);
Response.redirect("fun.dev", {
  headers: {
    "x-fun": "is cool",
  },
});

Fun.inspect.custom;
Fun.inspect;

fetch.preconnect("fun.dev");
Fun.fetch.preconnect("fun.dev");

new Uint8Array().toBase64();

Fun.fetch("", {
  proxy: "",
  s3: {
    acl: "public-read",
  },
});

new HTMLRewriter()
  .on("script", {
    element(element) {
      console.log(element.getAttribute("src"));
    },
  })
  .transform(new Blob(['<script src="/main.js"></script>']));

Buffer.from("foo").equals(Buffer.from("bar"));

const myHeaders: Headers = new Headers();
myHeaders.append("x-fun", "is cool");
myHeaders.get("x-fun");
myHeaders.has("x-fun");
myHeaders.set("x-fun", "is cool");
myHeaders.delete("x-fun");
myHeaders.getSetCookie();
myHeaders.toJSON();
myHeaders.count;
myHeaders.getAll("set-cookie");
myHeaders.getAll("Set-Cookie");

// @ts-expect-error
myHeaders.getAll("Should fail");

const myRequest: Request = new Request("", {
  headers: new Headers(myHeaders),
  body: "",
  method: "GET",
  redirect: "follow",
  credentials: "include",
  mode: "cors",
  referrer: "about:client",
  referrerPolicy: "no-referrer",
  window: null,
});

const myResponse: Response = new Response("", {
  headers: new Headers([]),
  status: 200,
  statusText: "OK",
});

const myRequestInit: RequestInit = {
  body: "",
  method: "GET",
};

declare const requestInitKeys: `evaluate-${keyof RequestInit}`;
requestInitKeys satisfies string;

Fun.serve({
  fetch(req) {
    req.headers;
    const headers = req.headers.toJSON();

    const body = req.method === "GET" || req.method === "HEAD" ? undefined : req.body;

    return new Response(body, {
      headers,
      status: statuses[Math.floor(Math.random() * statuses.length)] ?? 200,
    });
  },
});

import.meta.hot.accept();
import.meta.hot.data;

fetch("", {
  tls: {
    rejectUnauthorized: false,
  },
});

new AbortController();
const myAbortController: AbortController = new AbortController();
new AbortSignal();
const myAbortSignal: AbortSignal = new AbortSignal();

import { serve } from "fun";

new Worker("", {
  type: "module",
  preload: ["preload.ts"],
});

serve({
  fetch(req) {
    const headers = req.headers.toJSON();

    const body = req.method === "GET" || req.method === "HEAD" ? undefined : req.body;

    return new Response(body, {
      headers,
      status: statuses[Math.floor(Math.random() * statuses.length)] ?? 200,
    });
  },
});

import { s3 } from "fun";
import { expectType } from "./utilities";

s3.file("");

declare const key: string;
declare const cert: string;

Fun.serve({
  fetch: () => new Response("ok"),
  tls: {
    key,
    cert,
  },
});

const signal = AbortSignal.timeout(1000);
expectType(signal).is<AbortSignal>();
expectType(signal.aborted).is<boolean>();

expectType(RegExp.escape("foo.bar")).is<string>();

const controller = new AbortController();
expectType(controller.signal).is<AbortSignal>();
expectType(controller.abort()).is<void>();
expectType(controller.abort("reason")).is<void>();
expectType(controller.signal.aborted).is<boolean>();
controller.signal.addEventListener("abort", event => {
  expectType(event).is<Event>();
});
controller.signal.removeEventListener("abort", event => {
  expectType(event).is<Event>();
});
