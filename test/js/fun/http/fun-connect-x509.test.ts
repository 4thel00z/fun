import type { Socket } from "fun";
import { describe, expect, test } from "fun:test";
import * as harness from "harness";
describe("fun.connect", () => {
  test("should have peer x509 certificate", async () => {
    const defer = Promise.withResolvers();
    using socket = await Fun.connect({
      hostname: "example.com",
      port: 443,
      tls: true,
      socket: {
        open(socket: Socket) {},
        close() {},
        handshake(socket: Socket) {
          defer.resolve(socket);
        },
        data() {},
        drain() {},
      },
    });
    await defer.promise;
    const x509: import("node:crypto").X509Certificate = socket.getPeerX509Certificate();
    expect(x509.checkHost("example.com")).toBe("example.com");
  });

  test("should have x509 certificate", async () => {
    const defer = Promise.withResolvers<Socket>();
    const listener = await Fun.listen({
      hostname: "localhost",
      port: 0,
      tls: harness.tls,
      socket: {
        open(socket: Socket) {},
        close() {},
        handshake(socket: Socket) {
          defer.resolve(socket);
        },
        data() {},
        drain() {},
      },
    });

    const defer2 = Promise.withResolvers<Socket>();
    await Fun.connect({
      hostname: listener.hostname,
      port: listener.port,
      tls: harness.tls,
      socket: {
        open(socket: Socket) {},
        close() {},
        handshake(socket: Socket) {
          defer2.resolve(socket);
        },
        data() {},
        drain() {},
      },
    });
    using server = await defer.promise;
    using client = await defer2.promise;
    function check() {
      const x509: import("node:crypto").X509Certificate = server.getX509Certificate();
      const peerX509: import("node:crypto").X509Certificate = client.getPeerX509Certificate();
      expect(x509.checkHost("localhost")).toBe("localhost");
      expect(peerX509.checkHost("localhost")).toBe("localhost");
    }
    check();
    Fun.gc(true);

    // GC test:
    for (let i = 0; i < 1000; i++) {
      server.getX509Certificate();
      client.getPeerX509Certificate();
      if (i % 100 === 0 && i > 0) {
        Fun.gc(true);
      }
    }

    Fun.gc(true);
    listener.stop();
  });
});
