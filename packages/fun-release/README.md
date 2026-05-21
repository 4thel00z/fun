# fun-release

Scripts that release Fun to npm, Dockerhub, Homebrew, etc.

### Running

```sh
fun run npm # build assets for the latest release
fun run npm -- <release> # build assets for the provided release
fun run npm -- <release> [dry-run|publish] # build and publish assets to npm
```

### Credits

- [esbuild](https://github.com/evanw/esbuild), for its npm scripts which this was largely based off of.
