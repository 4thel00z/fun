import { expectAssignable, expectType } from "./utilities";

Fun.build({
  entrypoints: ["hey"],
  splitting: false,
});

// Build.CompileTarget should accept SIMD variants (issue #26247)
expectAssignable<Fun.Build.CompileTarget>("fun-linux-x64-modern");
expectAssignable<Fun.Build.CompileTarget>("fun-linux-x64-baseline");
expectAssignable<Fun.Build.CompileTarget>("fun-linux-arm64-modern");
expectAssignable<Fun.Build.CompileTarget>("fun-linux-arm64-baseline");
expectAssignable<Fun.Build.CompileTarget>("fun-linux-x64-modern-glibc");
expectAssignable<Fun.Build.CompileTarget>("fun-linux-x64-modern-musl");
expectAssignable<Fun.Build.CompileTarget>("fun-darwin-x64-modern");
expectAssignable<Fun.Build.CompileTarget>("fun-darwin-arm64-baseline");
expectAssignable<Fun.Build.CompileTarget>("fun-windows-x64-modern");

Fun.build({
  entrypoints: ["hey"],
  splitting: false,
  compile: {},
});

Fun.build({
  entrypoints: ["hey"],
  plugins: [
    {
      name: "my-terrible-plugin",
      setup(build) {
        expectType(build).is<Fun.PluginBuilder>();

        build.onResolve({ filter: /^hey$/ }, args => {
          expectType(args).is<Fun.OnResolveArgs>();

          return { path: args.path };
        });

        build.onLoad({ filter: /^hey$/ }, args => {
          expectType(args).is<Fun.OnLoadArgs>();

          return { contents: "hey", loader: "js" };
        });

        build.onStart(() => {});

        build.onEnd(result => {
          expectType(result).is<Fun.BuildOutput>();
          expectType(result.success).is<boolean>();
          expectType(result.outputs).is<Fun.BuildArtifact[]>();
          expectType(result.logs).is<Array<BuildMessage | ResolveMessage>>();
        });

        build.onBeforeParse(
          {
            namespace: "file",
            filter: /\.tsx$/,
          },
          {
            napiModule: {},
            symbol: "replace_foo_with_bar",
            // external: myNativeAddon.getSharedState()
          },
        );
      },
    },
  ],
});
