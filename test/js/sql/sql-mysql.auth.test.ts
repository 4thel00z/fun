import { SQL } from "fun";
import { expect, test } from "fun:test";
import { describeWithContainer } from "harness";

describeWithContainer(
  "mysql",
  {
    image: "mysql_native_password",
    env: {},
    args: [],
    concurrent: true,
  },
  container => {
    // Create getters that will be evaluated when the test runs
    const getUrl = () => `mysql://root:fun@${container.host}:${container.port}/fun_sql_test`;

    test("should be able to connect with mysql_native_password auth plugin", async () => {
      console.log("Container info in test:", container);
      await using sql = new SQL({
        url: getUrl(),
        max: 1,
      });
      const result = await sql`select 1 as x`;
      expect(result).toEqual([{ x: 1 }]);
      await sql.end();
    });

    test("should be able to switch auth plugin", async () => {
      {
        await using sql = new SQL({
          url: getUrl(),
          max: 1,
        });

        await sql`DROP USER IF EXISTS caching@'%';`.simple();
        await sql`CREATE USER caching@'%' IDENTIFIED WITH caching_sha2_password BY 'funfun';
              GRANT ALL PRIVILEGES ON fun_sql_test.* TO caching@'%';
            FLUSH PRIVILEGES;`.simple();
      }
      await using sql = new SQL(`mysql://caching:funfun@${container.host}:${container.port}/fun_sql_test`);
      const result = await sql`select 1 as x`;
      expect(result).toEqual([{ x: 1 }]);
      await sql.end();
    });
  },
);
