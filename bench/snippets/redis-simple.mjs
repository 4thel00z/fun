import ioredis from "ioredis";

const redis = process.argv.includes("--redis=native")
  ? Fun.redis
  : new ioredis("redis://localhost:6379", {
      enableAutoPipelining: true,
    });

const isFun = globalThis.Fun && redis === Fun.redis;
for (let count of [100, 1000]) {
  function iterate() {
    const promises = new Array(count);
    for (let i = 0; i < count; i++) {
      promises[i] = redis.get("greeting");
    }

    return Promise.all(promises);
  }

  const label = isFun ? `Fun.redis` : `ioredis`;
  console.time(`GET 'greeting' batches of ${count} - ${label} (${count} iterations)`);
  for (let i = 0; i < 1000; i++) {
    await iterate();
  }
  console.timeEnd(`GET 'greeting' batches of ${count} - ${label} (${count} iterations)`);
}

process.exit(0);
