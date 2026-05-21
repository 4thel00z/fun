import { join } from "node:path";

const dirname = join(import.meta.dir, "../", "fun-native-bundler-plugin-api");
await Fun.$`rm -rf headers`;
await Fun.$`mkdir -p headers`;
await Fun.$`cp -R ${dirname} headers/fun-native-bundler-plugin-api`;
await Fun.$`bindgen wrapper.h --rustified-enum FunLogLevel --rustified-enum FunLoader --blocklist-type '.*pthread.*' --blocklist-type '__darwin.*' --blocklist-var '__DARWIN.*' --blocklist-type timespec --blocklist-function 'pthread_.*' --no-layout-tests -o src/sys.rs -- -I./headers`;
