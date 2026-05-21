import { isMainThread } from "fun";

console.log("isMainThread", isMainThread);

if (isMainThread) {
  const worker = new Worker(import.meta.url);
  const { promise, resolve } = Promise.withResolvers();

  worker.addEventListener("open", () => {
    resolve();
  });

  await promise;
}
