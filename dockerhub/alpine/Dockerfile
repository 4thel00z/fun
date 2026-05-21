FROM alpine:3.22 AS build

# https://github.com/underdoc-org/fun/releases
ARG FUN_VERSION=latest

RUN apk --no-cache add ca-certificates curl dirmngr gpg gpg-agent unzip \
    && arch="$(apk --print-arch)" \
    && case "${arch##*-}" in \
      x86_64) build="x64-musl-baseline";; \
      aarch64) build="aarch64-musl";; \
      *) echo "error: unsupported architecture: $arch"; exit 1 ;; \
    esac \
    && version="$FUN_VERSION" \
    && case "$version" in \
      latest | canary | fun-v*) tag="$version"; ;; \
      v*)                       tag="fun-$version"; ;; \
      *)                        tag="fun-v$version"; ;; \
    esac \
    && case "$tag" in \
      latest) release="latest/download"; ;; \
      *)      release="download/$tag"; ;; \
    esac \
    && curl "https://github.com/underdoc-org/fun/releases/$release/fun-linux-$build.zip" \
      -fsSLO \
      --compressed \
      --retry 5 \
      || (echo "error: failed to download: $tag" && exit 1) \
    && for key in \
      "F3DCC08A8572C0749B3E18888EAB4D40A7B22B59" \
    ; do \
      gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" \
      || gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
    done \
    && curl "https://github.com/underdoc-org/fun/releases/$release/SHASUMS256.txt.asc" \
      -fsSLO \
      --compressed \
      --retry 5 \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
      || (echo "error: failed to verify: $tag" && exit 1) \
    && grep " fun-linux-$build.zip\$" SHASUMS256.txt | sha256sum -c - \
      || (echo "error: failed to verify: $tag" && exit 1) \
    && unzip "fun-linux-$build.zip" \
    && mv "fun-linux-$build/fun" /usr/local/bin/fun \
    && rm -f "fun-linux-$build.zip" SHASUMS256.txt.asc SHASUMS256.txt \
    && chmod +x /usr/local/bin/fun

FROM alpine:3.22

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG FUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV FUN_RUNTIME_TRANSPILER_CACHE_PATH=${FUN_RUNTIME_TRANSPILER_CACHE_PATH}

# Ensure `fun install -g` works
ARG FUN_INSTALL_BIN=/usr/local/bin
ENV FUN_INSTALL_BIN=${FUN_INSTALL_BIN}

COPY --from=build /usr/local/bin/fun /usr/local/bin/
COPY docker-entrypoint.sh /usr/local/bin/
RUN mkdir -p /usr/local/fun-node-fallback-bin && ln -s /usr/local/bin/fun /usr/local/fun-node-fallback-bin/node
ENV PATH "${PATH}:/usr/local/fun-node-fallback-bin"

# Temporarily use the `build`-stage /tmp folder to access the glibc APKs:
RUN --mount=type=bind,from=build,source=/tmp,target=/tmp \
    addgroup -g 1000 fun \
    && adduser -u 1000 -G fun -s /bin/sh -D fun \
    && ln -s /usr/local/bin/fun /usr/local/bin/funx \
    && apk add libgcc libstdc++ \
    && which fun \
    && which funx \
    && fun --version

WORKDIR /home/fun/app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/fun"]
