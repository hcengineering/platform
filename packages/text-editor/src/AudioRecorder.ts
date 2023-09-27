export default class AudioRecorder {
    _stream: MediaStream | null = null
    _audio: MediaRecorder | null = null
    _chunks: BlobPart[] = []
    _completeListeners: ((file: File) => void)[] = []

    exist() {
        return navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    }

    start() {
        if (this.exist()) {
            navigator
                .mediaDevices
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

    _triggerComplete(file: File) {
        this._completeListeners.forEach((listener) => {
            listener(file)
        })
    }

    onComplete(callback: (file: File) => void) {
        this._completeListeners.push(callback)
    }

    stop() {
        if (this._stream) this._stream.getTracks().forEach((track) => track.stop())
    }

    complete(file: File) {
        console.log('Recording completed:', file)
    }
}
