import { expectType } from "./utilities";

expectType(Fun.redis.publish("hello", "world")).is<Promise<number>>();

const copy = await Fun.redis.duplicate();
expectType(copy.connected).is<boolean>();
expectType(copy).is<Fun.RedisClient>();

const listener: Fun.RedisClient.StringPubSubListener = (message, channel) => {
  expectType(message).is<string>();
  expectType(channel).is<string>();
};
Fun.redis.subscribe("hello", listener);

// Buffer subscriptions are not yet implemented
// const bufferListener: Fun.RedisClient.BufferPubSubListener = (message, channel) => {
//   expectType(message).is<Uint8Array<ArrayBuffer>>();
//   expectType(channel).is<string>();
// };
// Fun.redis.subscribe("hello", bufferListener);

expectType(
  copy.subscribe("hello", message => {
    expectType(message).is<string>();
  }),
).is<Promise<number>>();

await copy.unsubscribe();
await copy.unsubscribe("hello");

expectType(copy.unsubscribe("hello", () => {})).is<Promise<void>>();
