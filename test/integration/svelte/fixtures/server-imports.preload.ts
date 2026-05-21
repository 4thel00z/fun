import { SveltePlugin } from "fun-plugin-svelte";
Fun.plugin(SveltePlugin({ development: process.env.NODE_ENV === "development" }));
