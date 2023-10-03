//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export default class AudioRecorder {
  _stream: MediaStream | null = null
  _audio: MediaRecorder | null = null
  _chunks: BlobPart[] = []
  _completeListeners: Array<(file: File) => void> = []

  exist(): boolean {
    return typeof navigator.mediaDevices?.getUserMedia === 'function'
  }

  start(): void {
    if (this.exist()) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this._stream = stream
          this._audio = new MediaRecorder(stream)

          this._audio.ondataavailable = (event) => {
            if (event.data.size > 0) this._chunks.push(event.data)
          }

          this._audio.onstop = () => {
            if (this._chunks.length > 0) {
              const blob = new Blob(this._chunks, { type: 'audio/wav' })
              const file = new File([blob], 'voice.wav', { type: 'audio/wav' })
              this._triggerComplete(file)
              this._chunks = []
            }
          }

          this._audio.start()
        })
        .catch((error) => {
          console.error('Access to Microphone device error:', error)
        })
    }
  }

  _triggerComplete(file: File): void {
    this._completeListeners.forEach((listener) => {
      listener(file)
    })
  }

  onComplete(callback: (file: File) => void): void {
    this._completeListeners.push(callback)
  }

  stop(): void {
    if (this._stream != null) this._stream.getTracks().forEach((track) => track.stop())
  }

  complete(file: File): void {
    console.log('Recording completed:', file)
  }
}
