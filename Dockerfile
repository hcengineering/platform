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

FROM --platform=$BUILDPLATFORM golang:1.23.5 AS builder
ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOBIN=/bin
ARG BUILDARCH=amd64

COPY . ./

RUN set -xe && GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /go/bin/huly-stream ./cmd/huly-stream

FROM alpine

RUN set -xe && apk add --no-cache ffmpeg
RUN apk add --no-cache ca-certificates jq bash \
    && addgroup -g 1000 huly-stream \
    && adduser -u 1000 -G huly-stream -s /bin/sh -D huly-stream \
    && chown huly-stream:huly-stream /.
COPY --from=builder /go/bin/huly-stream /huly-stream

EXPOSE 1080
USER huly-stream

ENTRYPOINT ["/huly-stream"]