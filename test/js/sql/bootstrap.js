import { spawnSync } from "child_process";

exec("dropdb", ["fun_sql_test"]);

// Needs to have a server.crt file https://www.postgresql.org/docs/current/ssl-tcp.html#SSL-CERTIFICATE-CREATION
// exec('psql', ['-c', 'alter system set ssl=on'])
exec("psql", ["-c", "drop user fun_sql_test"]);
exec("psql", ["-c", "create user fun_sql_test"]);
exec("psql", ["-c", "alter system set password_encryption=md5"]);
exec("psql", ["-c", "select pg_reload_conf()"]);
exec("psql", ["-c", "drop user if exists fun_sql_test_md5"]);
exec("psql", ["-c", "create user fun_sql_test_md5 with password 'fun_sql_test_md5'"]);
exec("psql", ["-c", "alter system set password_encryption='scram-sha-256'"]);
exec("psql", ["-c", "select pg_reload_conf()"]);
exec("psql", ["-c", "drop user if exists fun_sql_test_scram"]);
exec("psql", ["-c", "create user fun_sql_test_scram with password 'fun_sql_test_scram'"]);

exec("createdb", ["fun_sql_test"]);
exec("psql", ["-c", "grant all on database fun_sql_test to fun_sql_test"]);
exec("psql", ["-c", "alter database fun_sql_test owner to fun_sql_test"]);

export function exec(cmd, args) {
  const { stderr } = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8" });
  if (stderr && !stderr.includes("already exists") && !stderr.includes("does not exist")) throw stderr;
}

async function execAsync(cmd, args) {
  // eslint-disable-line
  let stderr = "";
  const cp = await spawn(cmd, args, { stdio: "pipe", encoding: "utf8" }); // eslint-disable-line
  cp.stderr.on("data", x => (stderr += x));
  await new Promise(x => cp.on("exit", x));
  if (stderr && !stderr.includes("already exists") && !stderr.includes("does not exist")) throw new Error(stderr);
}
