FROM debian:trixie-slim AS build

# https://github.com/underdoc-org/fun/releases
ARG FUN_VERSION=latest

# Node.js includes python3 for node-gyp, see https://github.com/underdoc-org/fun/issues/9807
# Though, not on slim and alpine images.
RUN apt-get update -qq \
    && apt-get install -qq --no-install-recommends \
      ca-certificates \
      curl \
      dirmngr \
      gpg \
      gpg-agent \
      unzip \
      python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && arch="$(dpkg --print-architecture)" \
    && case "${arch##*-}" in \
      amd64) build="x64-baseline";; \
      arm64) build="aarch64";; \
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

FROM debian:trixie

COPY docker-entrypoint.sh /usr/local/bin
COPY --from=build /usr/local/bin/fun /usr/local/bin/fun
RUN mkdir -p /usr/local/fun-node-fallback-bin && ln -s /usr/local/bin/fun /usr/local/fun-node-fallback-bin/node
ENV PATH "${PATH}:/usr/local/fun-node-fallback-bin"

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG FUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV FUN_RUNTIME_TRANSPILER_CACHE_PATH=${FUN_RUNTIME_TRANSPILER_CACHE_PATH}

# Ensure `fun install -g` works
ARG FUN_INSTALL_BIN=/usr/local/bin
ENV FUN_INSTALL_BIN=${FUN_INSTALL_BIN}

RUN groupadd fun \
      --gid 1000 \
    && useradd fun \
      --uid 1000 \
      --gid fun \
      --shell /bin/sh \
      --create-home \
    && ln -s /usr/local/bin/fun /usr/local/bin/funx \
    && which fun \
    && which funx \
    && fun --version

WORKDIR /home/fun/app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/fun"]
