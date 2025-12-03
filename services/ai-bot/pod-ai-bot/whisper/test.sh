#!/bin/bash

# Test transcription using OpenAI-compatible endpoint
# Usage: ./test.sh [audio_file] [response_format]

AUDIO_FILE="${1:-./tests/1764653810474.wav}"
RESPONSE_FORMAT="${2:-verbose_json}"
HOST="${HOST:-127.0.0.1:9007}"

echo "Testing transcription..."
echo "  Host: $HOST"
echo "  File: $AUDIO_FILE"
echo "  Format: $RESPONSE_FORMAT"
echo ""

curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@${AUDIO_FILE}" \
  -F "model=whisper-1" \
  -F "language=ru" \
  -F "response_format=${RESPONSE_FORMAT}" \
  -F "timestamp_granularities[]=word" \
  -F "timestamp_granularities[]=segment" \
  "${HOST}/v1/audio/transcriptions"

echo ""
