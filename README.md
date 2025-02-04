# Huly Stream

[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/huly_io?style=for-the-badge)](https://x.com/huly_io)
![GitHub License](https://img.shields.io/github/license/hcengineering/platform?style=for-the-badge)

## About

The Huly Stream high-performance HTTP-based transcoding service. Huly-stream is built around the **TUS protocol**, enabling reliable, resumable file uploads and downloads. Designed for seamless and consistent media processing,it supports advanced transcoding features with robust integration options.

---

## Features

### TUS Protocol Support
- **Resumable transcoding**: Leveraging the TUS protocol, Huly-stream ensures reliable and efficient stream processing.

### Input Support
- **Supported Input Formats**:
  - `mp4`
  - `webm`

### Output Options
- **Supported Output Formats**:
  - `aac`
  - `hls`

### Upload options
- **TUS Upload**: Resumable file uploads via TUS protocol.
- **s3 Upload**: Direct upload to S3 storage.
- **datalake Upload**: Upload to datalake storage.

### Key Functionalities
- **Live transcoing with minimal upload time**: Transcoding results are going to be avaible after stream completion.
- **Transcoding Cancelation**: Cancel or pause ongoing transcoding in real-time.
- **Transcoding Resumption**: Resume incomplete transcoding tasks efficiently.

---

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
   docker build . -t hcengineering/huly-stream:latest
   ```


---

## Configuraiton

### App env configuraiton
The following environment variables can be used:
```
KEY                                TYPE             DEFAULT             REQUIRED    DESCRIPTION
STREAM_SECRET_TOKEN                String                                           secret token for authorize requests
STREAM_LOG_LEVEL                   String           debug                           sets log level for the application
STREAM_PPROF_ENABLED               True or False    false                           starts profile server on localhost:6060 if true
STREAM_INSECURE                    True or False    false                           ignores authorization check if true
STREAM_SERVE_URL                   String           0.0.0.0:1080                    app listen url
STREAM_ENDPOINT_URL                URL                                              S3 or Datalake endpoint, example: s3://my-ip-address, datalake://my-ip-address
STREAM_MAX_CAPACITY                Integer          6220800                         represents the amount of maximum possible capacity for the transcoding. The default value is 1920 * 1080 * 3.
STREAM_MAX_THREADS                 Integer          4                               means upper bound for the transcoing provider.
STREAM_OUTPUT_DIR                  String           /tmp/transcoing/                path to the directory with transcoding result.
STREAM_REMOVE_CONTENT_ON_UPLOAD    True or False    true                            deletes all content when content delivered if true
STREAM_UPLOAD_RAW_CONTENT          True or False    false                           uploads content in raw quality to the endpoint if true
```

### Metadata

**resolutions:** if passed, set the resolution for the output, for example, 'resolutions: 1920:1080, 1280:720.'

**token:** must be provided to be authorized in the Huly's datalake service.

**workspace:** required for uploading content to the datalake storage.



#### S3 Env configuration

if you're working with S3 storage type, these envs must be provided:
**AWS_ACCESS_KEY_ID**
**AWS_SECRET_ACCESS_KEY**

## Usage

The service exposes an HTTP API. Below are some examples of how to interact with it.

### Upload a File for Transcoding via TUS
```bash
curl -X POST http://localhost:1080/transcoing \
     -H "Tus-Resumable: 1.0.0" \
     -H "Upload-Length: <file-size>" \
     --data-binary @path/to/your/file.mp4
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

Enjoy seamless transcoding with huly-stream! 🚀