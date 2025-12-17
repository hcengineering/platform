#!/bin/bash

python3.12 -m venv venv
git clone git@github.com:ahmetoner/whisper-asr-webservice.git whisper-asr
source ./venv/bin/activate
pip3 install poetry
cd whisper-asr
pip3 install poetry
poetry install --extras cpu
poetry run whisper-asr-webservice --host 0.0.0.0 --port 9007


#   # -e ASR_ENGINE=faster_whisper \
# docker run -ti -p 9007:9007 \
#   -e ASR_MODEL=turbo \
#   -e ASR_ENGINE=whisperx \
#   -e PORT=9007 \
#   -e ASR_MODEL_PATH=/data/whisper \
#   -v $PWD/cache:/data/whisper \
#   onerahmet/openai-whisper-asr-webservice:latest
