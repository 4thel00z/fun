import type { FunFile, FunPlugin, FileBlob } from "fun";
import * as tsd from "./utilities";
{
  const _plugin: FunPlugin = {
    name: "asdf",
    setup() {},
  };
  _plugin;
}

{
  // tslint:disable-next-line:no-void-expression
  const arg = Fun.plugin({
    name: "arg",
    setup() {},
  });

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  tsd.expectType<void>(arg);
}

{
  // tslint:disable-next-line:no-void-expression
  const arg = Fun.plugin({
    name: "arg",
    async setup() {},
  });

  tsd.expectType<Promise<void>>(arg);
}

{
  const f = Fun.file("asdf");
  tsd.expectType<FunFile>(f);
  tsd.expectType<FileBlob>(f);
}
{
  Fun.spawn(["anything"], {
    env: process.env,
  });
  Fun.spawn(["anything"], {
    env: { ...process.env },
  });
  Fun.spawn(["anything"], {
    env: { ...process.env, dummy: "" },
  });
}
{
  Fun.TOML.parse("asdf = asdf");
}

DOMException;

tsd
  .expectType(
    Fun.secrets.get({
      service: "hey",
      name: "hey",
    }),
  )
  .is<Promise<string | null>>();

tsd
  .expectType(
    Fun.secrets.set({
      service: "hey",
      name: "hey",
      value: "hey",
      allowUnrestrictedAccess: true,
    }),
  )
  .is<Promise<void>>();

tsd
  .expectType(
    Fun.secrets.delete({
      service: "hey",
      name: "hey",
    }),
  )
  .is<Promise<boolean>>();
