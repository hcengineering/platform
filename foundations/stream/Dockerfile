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

FROM base AS linter

RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b $(go env GOPATH)/bin v2.5.0

RUN golangci-lint run --verbose

FROM base AS builder

COPY . ./

RUN set -xe && GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /go/bin/stream ./cmd/stream

FROM alpine

RUN set -xe && apk add --no-cache ffmpeg
RUN apk add --no-cache ca-certificates jq bash \
    && addgroup -g 1000 stream \
    && adduser -u 1000 -G stream -s /bin/sh -D stream \
    && chown stream:stream /.
COPY --from=builder /go/bin/stream /stream

EXPOSE 1080
USER stream

ENTRYPOINT ["/stream"]