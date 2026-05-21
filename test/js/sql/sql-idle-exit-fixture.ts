const tls = process.env.CA_PATH ? { ca: Fun.file(process.env.CA_PATH) } : undefined;
const sql = new Fun.SQL({
  url: process.env.MYSQL_URL,
  tls,
  max: 1,
  // Set timeouts high enough to not fire during this test
  idleTimeout: 100,
  maxLifetime: 100,
  connectionTimeout: 100,
});

const result = await sql`select 1`;
console.log(result);
// process should exit with code 0
