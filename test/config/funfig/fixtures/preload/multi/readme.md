Used to test 3 behaviors:

1. `preload` can be an array
2. When a funfig is specified via `--config=<path>`, the "default" funfig (i.e.
   `funfig.toml` in the same dir as cwd) is not loaded.
3. Using `--preload <file>` adds `<file>` to the preload list without clobbering
   existing preloads.
