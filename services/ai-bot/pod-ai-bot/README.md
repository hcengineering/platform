# AI Bot Service (pod-ai-bot)

AI Bot service for Huly platform providing translation, summarization, and audio transcription capabilities.

## Features

- **Translation** - Translate text between languages using OpenAI
- **Summarization** - Summarize chat messages
- **Audio Transcription** - Transcribe meeting audio from LiveKit to text
- **Love Integration** - Meeting minutes transcription for Huly Love (video conferencing)

## Environment Variables

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `ACCOUNTS_URL` | Accounts service URL | Required |
| `SERVER_SECRET` | Server secret for authentication | Required |
| `SERVICE_ID` | Service identifier | `ai-bot-service` |
| `PORT` | HTTP server port | `4010` |
| `FIRST_NAME` | AI bot first name | Required |
| `LAST_NAME` | AI bot last name | Required |

### OpenAI Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required for AI features |
| `OPENAI_MODEL` | OpenAI model for chat | `gpt-4o-mini` |
| `OPENAI_TRANSLATE_MODEL` | Model for translation | `gpt-4o-mini` |
| `OPENAI_SUMMARY_MODEL` | Model for summarization | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Custom OpenAI API base URL | OpenAI default |
| `MAX_CONTENT_TOKENS` | Maximum tokens for content | `12800` |
| `MAX_HISTORY_RECORDS` | Maximum history records | `500` |

### Transcription Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `STT_PROVIDER` | STT provider: `openai`, `deepgram`, or `wsr` | `wsr` |
| `STT_URL` | API URL for the provider (required for `wsr`) | - |
| `STT_API_KEY` | API key (required for `openai` and `deepgram`) | - |
| `STT_MODEL` | Model name (provider-specific) | Provider default |

#### Provider Configuration Examples

**Whisper ASR Webservice (`wsr`)** - Recommended for self-hosted:
```bash
STT_PROVIDER=wsr
STT_URL=http://localhost:9000
```

Uses [whisper-asr-webservice](https://github.com/ahmetoner/whisper-asr-webservice).

**Deepgram (`deepgram`)**:
```bash
STT_PROVIDER=deepgram
STT_API_KEY=your-deepgram-api-key
STT_MODEL=nova-2  # optional, default is nova-2
```

**OpenAI Whisper (`openai`)**:
```bash
STT_PROVIDER=openai
STT_API_KEY=your-openai-api-key
STT_URL=https://api.openai.com/v1  # optional, for custom endpoints
STT_MODEL=whisper-1  # optional, default is whisper-1
```

#### Deepgram Billing (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPGRAM_API_KEY` | Deepgram API key for billing tracking | - |
| `DEEPGRAM_PROJECT_ID` | Deepgram project ID for billing | - |
| `DEEPGRAM_TAG` | Tag for billing tracking | - |
| `DEEPGRAM_POLL_INTERVAL_MINUTES` | Billing poll interval | `60` |

### Voice Activity Detection (VAD)

| Variable | Description | Default |
|----------|-------------|---------|
| `VAD_RMS_THRESHOLD` | RMS amplitude threshold for speech detection | `0.02` |
| `VAD_SPEECH_RATIO_THRESHOLD` | Minimum ratio of active samples | `0.1` |

### Love Integration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOVE_ENDPOINT` | Love service endpoint | - |
| `BILLING_URL` | Billing service URL | - |

## Transcription Architecture

### Audio Flow

1. **love-agent** captures audio from LiveKit rooms
2. Audio is chunked into segments
3. Chunks are gzipped and sent to ai-bot via `/love/send_raw`
4. ai-bot stores chunks in storage and queues for transcription
5. Transcription consumer processes queue:
   - Loads and decompresses audio
   - Verifies speech presence with VAD (doesn't trust sender)
   - Transcribes using configured provider
   - Sends transcript to meeting minutes

### Providers

#### whisper-asr (Recommended)

Self-hosted option using [whisper-asr-webservice](https://github.com/ahmetoner/whisper-asr-webservice):

```bash
docker run -d -p 9000:9000 \
  -e ASR_MODEL=base \
  -e ASR_ENGINE=faster_whisper \
  onerahmet/openai-whisper-asr-webservice:latest
```

For GPU acceleration:
```bash
docker run -d --gpus all -p 9000:9000 \
  -e ASR_MODEL=medium \
  -e ASR_ENGINE=faster_whisper \
  onerahmet/openai-whisper-asr-webservice:latest-gpu
```

#### deepgram

Cloud-based Deepgram API. Requires `DEEPGRAM_API_KEY`.

#### openai

Cloud-based OpenAI Whisper API. Uses existing `OPENAI_API_KEY`.

## API Endpoints

### POST /translate
Translate text to specified language.

### POST /summarize
Summarize chat messages.

### POST /connect
Connect to a workspace.

### POST /events
Process AI events from queue.

### POST /love/transcript
Receive text transcripts from love-agent (real-time STT).

### POST /love/send_raw
Receive gzipped audio chunks for transcription.

Headers:
- `X-Room-Name` - LiveKit room name
- `X-Participant` - Participant identity
- `X-Start-Time` - Chunk start time (seconds)
- `X-End-Time` - Chunk end time (seconds)
- `X-Duration` - Chunk duration (seconds)
- `X-Has-Speech` - Whether chunk contains speech (not trusted)
- `X-Speech-Ratio` - Ratio of speech samples


### POST /love/send_session
Receive full session Opus recording for attachment.

### POST /love/connect
Connect AI to a Love room.

### POST /love/disconnect
Disconnect AI from a Love room.

### GET /love/:roomName/identity
Get AI identity for joining a room.

## Development

```bash
# Install dependencies
rush install

# Build
rush build --to @hcengineering/pod-ai-bot

# Run locally
rushx run-local

# Run tests
rushx test
```
