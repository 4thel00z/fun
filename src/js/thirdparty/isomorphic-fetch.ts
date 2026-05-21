const funFetch = Fun.fetch;
const fetch = (...args: Parameters<typeof funFetch>) => funFetch(...args);
fetch.default = fetch;
fetch.fetch = fetch;
export default fetch;
