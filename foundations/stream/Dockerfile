# Copyright © 2025 Hardcore Engineering Inc.
#
# Licensed under the Eclipse Public License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may
# obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#
# See the License for the specific language governing permissions and
# limitations under the License.

FROM golang:1.24.4 AS base

WORKDIR /app

ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOBIN=/bin
ENV PATH=$PATH:$GOBIN
ARG BUILDARCH=amd64

# Download modules once into a dedicated layer so they can be cached
FROM base AS deps

# Copy only go.mod and go.sum to leverage Docker layer caching
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

# Linter stage: reuse downloaded modules from deps
FROM base AS linter

# Install linter and run it against the source
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b $(go env GOPATH)/bin v2.5.0

# Copy go.mod and go.sum for module resolution
COPY go.mod go.sum ./

# Copy full source for linting
COPY . ./

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    golangci-lint run --verbose

# Builder stage: reuse modules and build caches, then compile
FROM base AS builder

# Copy go.mod and go.sum for module resolution
COPY go.mod go.sum ./

# Copy the rest of the source
COPY . ./

# Allow overriding target OS/ARCH at build time (optional)
ARG TARGETOS
ARG TARGETARCH

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    set -xe && GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build -o /go/bin/stream ./cmd/stream

# Final runtime image
FROM alpine

RUN set -xe && apk add --no-cache ffmpeg
RUN apk add --no-cache ca-certificates jq bash \
    && addgroup -g 1000 stream \
    && adduser -u 1000 -G stream -s /bin/sh -D stream

COPY --from=builder /go/bin/stream /stream
RUN chown stream:stream /stream

EXPOSE 1080
USER stream

ENTRYPOINT ["/stream"]
