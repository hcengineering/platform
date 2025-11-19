FROM --platform=$BUILDPLATFORM rust:1.88 AS builder
ARG TARGETPLATFORM

WORKDIR /tmp/build

COPY . .

RUN echo build for $TARGETPLATFORM
RUN \
    if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
        apt-get update && apt-get install -y cmake \
        && rm -rf /var/lib/apt/lists/* ; \
        cargo build --release --target=x86_64-unknown-linux-gnu --package hulylake; \
    elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        apt-get update && apt-get install -y \
        gcc-aarch64-linux-gnu \
        g++-aarch64-linux-gnu \
        libc6-dev-arm64-cross \
        cmake \
        && rm -rf /var/lib/apt/lists/* ; \
        rustup target add aarch64-unknown-linux-gnu ; \
        export CC_aarch64_unknown_linux_gnu=aarch64-linux-gnu-gcc ; \
        export CXX_aarch64_unknown_linux_gnu=aarch64-linux-gnu-g++ ; \
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc ; \
        cargo tree --target=aarch64-unknown-linux-gnu ; \
        cargo build --release --target=aarch64-unknown-linux-gnu --package hulylake ; \
    else \
      echo "Unexpected target platform: $TARGETPLATFORM" && exit 1 ; \
    fi

RUN cargo test

FROM debian:12-slim

ARG TARGET
COPY --from=builder /tmp/build/target/*/release/hulylake /usr/local/bin/hulylake
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/usr/local/bin/hulylake"]
