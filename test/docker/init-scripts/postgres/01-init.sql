-- PostgreSQL initialization script for plain setup
ALTER SYSTEM SET max_prepared_transactions = '1000';
ALTER SYSTEM SET max_connections = '2000';

-- Create test users with different auth methods
CREATE USER fun_sql_test;
CREATE USER fun_sql_test_md5 WITH PASSWORD 'fun_sql_test_md5';
CREATE USER fun_sql_test_scram WITH PASSWORD 'fun_sql_test_scram';

-- Create test database
CREATE DATABASE fun_sql_test;

-- Grant permissions to all test users
GRANT ALL ON DATABASE fun_sql_test TO fun_sql_test;
GRANT ALL ON DATABASE fun_sql_test TO fun_sql_test_md5;
GRANT ALL ON DATABASE fun_sql_test TO fun_sql_test_scram;

ALTER DATABASE fun_sql_test OWNER TO fun_sql_test;