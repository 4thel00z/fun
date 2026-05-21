const str = "a".repeat(300000);
await Fun.write(Fun.stdout, str);
