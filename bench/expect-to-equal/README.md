# expect-to-equal

To install dependencies:

```bash
fun install
```

To run in Fun:

```bash
# so it doesn't run the vitest one
fun test expect-to-equal.test.js
```

To run in Jest:

```bash
# If you remove the import the performance doesn't change much
NODE_OPTIONS="--experimental-vm-modules" ./node_modules/.bin/jest expect-to-equal.test.js
```

To run in Vitest:

```bash
./node_modules/.bin/vitest --run expect-to-equal.vitest.test.js
```

Output on my machine (M1):

fun:test (fun v0.3.0):

> [36.40ms] expect().toEqual() x 10000

jest (node v18.11.0)

> expect().toEqual() x 10000: 5053 ms

vitest (node v18.11.0)

> expect().toEqual() x 10000: 401.08ms

This project was created using `fun init` in fun v0.3.0. [Fun](https://fun.dev) is a fast all-in-one JavaScript runtime.
