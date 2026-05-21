import { expectType } from "./utilities";

async function* listReleases() {
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/repos/underdoc-org/fun/releases?page=${page}`);
    const releases = (await response.json()) as Array<{ data: string }>;
    if (!releases.length) {
      break;
    }
    for (const release of releases) {
      yield release;
    }
  }
}

await Array.fromAsync(listReleases());

// Tests from issue #8484
// https://github.com/underdoc-org/fun/issues/8484
async function* naturals() {
  for (let i = 0; i < 10; i++) {
    yield i;
  }
}

const test1 = await Array.fromAsync(naturals(), n => Promise.resolve(`${n}`));
expectType<string[]>(test1);

const test2 = await Array.fromAsync([Promise.resolve(1), Promise.resolve(2)]);
expectType<number[]>(test2);

export {};
