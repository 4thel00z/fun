import { RedisClient } from "fun";

function getOptions() {
  if (process.env.FUN_VALKEY_TLS) {
    const paths = JSON.parse(process.env.FUN_VALKEY_TLS);
    return {
      tls: {
        key: Fun.file(paths.key),
        cert: Fun.file(paths.cert),
        ca: Fun.file(paths.ca),
        rejectUnauthorized: false,
      },
    };
  }
  return {};
}

{
  const client = new RedisClient(process.env.FUN_VALKEY_URL, getOptions());
  client
    .connect()
    .then(redis => {
      console.log("connected");
      client.close();
    })
    .catch(err => {
      console.error(err);
    });
}
