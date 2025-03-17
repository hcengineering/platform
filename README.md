# Stream

[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/huly_io?style=for-the-badge)](https://x.com/huly_io)
![GitHub License](https://img.shields.io/github/license/hcengineering/platform?style=for-the-badge)

## About

The Stream is high-performance HTTP-based transcoding service. *Stream* supports  **TUS protocol**, enabling reliable,
resumable transcodings. Designed for seamless and consistent media processing,it supports advanced transcoding features
with robust integration options.

---

## Features

### TUS Protocol Support

- **Resumable transcoding**: Leveraging the TUS protocol, *Stream* ensures reliable and efficient transcoding bucket
  processing.

#### Input Support

- **Supported Input Formats**:
    - `mp4`
    - `webm`

#### Output Options

- **Supported Output Formats**:
    - `hls`

#### Upload options

- **s3 Upload**: Direct upload to S3 storage.
- **datalake Upload**: Upload to datalake storage.

#### Key Functionalities

- **Live transcoing with minimal upload time**: Transcoding results are going to be avaible after stream completion.
- **Transcoding Cancelation**: Cancel or pause ongoing transcoding in real-time.
- **Transcoding Resumption**: Resume incomplete transcoding tasks efficiently.

### Transcoding scheduling

## Installation

### Prerequisites

- [Go](https://golang.org/dl/) (v1.23+ recommended)
- [ffmpeg](https://www.ffmpeg.org/download.html) (ensure it’s installed and available in your system's PATH)

### Steps

1. Install dependencies:

```bash
go mod tidy
```

2. Build the service:

```bash
docker build . -t hcengineering/sream:latest
```

---

## Configuraiton

### App env configuraiton

The following environment variables can be used:

```
KEY                                TYPE             DEFAULT             STREAM_LOG_LEVEL                     String           debug                              sets log level for the application
STREAM_SERVER_SECRET                 String                                              server secret required to generate and verify tokens
STREAM_PPROF_ENABLED                 True or False    true                               starts profile server on localhost:6060 if true
STREAM_INSECURE                      True or False    false                              ignores authorization check if true
STREAM_SERVE_URL                     String           0.0.0.0:1080                       listen on url
STREAM_ENDPOINT_URL                  URL              s3://127.0.0.1:9000                S3 or Datalake endpoint, example: s3://my-ip-address, datalake://my-ip-address
STREAM_MAX_PARALLEL_SCALING_COUNT    Integer          2                                  how much parallel scaling can be processed
STREAM_MAX_THREAD_COUNT              Integer          4                                  max number of threads for transcoder
STREAM_OUTPUT_DIR                    String           /tmp/transcoing/                   path to the directory with tra
```

### Metadata

**resolution:** if passed, set the resolution for the output, for example, 'resolution: 1920:1080'.

**token:** must be provided to be authorized in the Huly's datalake service.

**workspace:** required for uploading content to the datalake storage.

#### S3 Env configuration

if you're working with S3 storage type, these envs must be provided:
**AWS_ACCESS_KEY_ID**
**AWS_SECRET_ACCESS_KEY**

## Usage

The service exposes an HTTP API.

Below are some examples of how to interact with it.

### Trnascode via TUS

```bash
curl -X POST http://localhost:1080/recording \
     -H "Tus-Resumable: 1.0.0" \
     -H "Upload-Length: <file-size>" \
     --data-binary @path/to/your/file.mp4
```

Note: tus client is required, to play with a service locally you can use tus-js-client example
with [video](https://github.com/tus/tus-js-client/blob/main/demos/browser/video.html)

### Schedule a transcoding

```bash
curl -X POST http://localhost:1080/transcoding \
  -H "Content-Type: application/json" \
  -H  "Authorization: Bearer <token>" \
  -d '{
      "source": "<input file name>",
      "format": "hls",
      "workspace": "test"
  }'
```

## Contributing

We welcome contributions! To get started:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request describing your changes.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

Enjoy seamless transcoding with *Stream*! 🚀