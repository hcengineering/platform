// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import {
  WAV_HEADER_SIZE,
  createWavHeader,
  createWavHeaderBuffer,
  updateWavHeaderLength,
  parseWavHeader,
  getWavDuration,
  extractWavSamples,
  createWavFile,
  createWavFileFromFloat
} from '../wav'

describe('WAV utilities', () => {
  describe('WAV_HEADER_SIZE', () => {
    it('should be 44 bytes', () => {
      expect(WAV_HEADER_SIZE).toBe(44)
    })
  })

  describe('createWavHeader', () => {
    it('should create a valid 44-byte header', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      expect(header).toBeInstanceOf(Uint8Array)
      expect(header.length).toBe(44)
    })

    it('should contain RIFF identifier', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const riff = String.fromCharCode(header[0], header[1], header[2], header[3])
      expect(riff).toBe('RIFF')
    })

    it('should contain WAVE identifier', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const wave = String.fromCharCode(header[8], header[9], header[10], header[11])
      expect(wave).toBe('WAVE')
    })

    it('should contain fmt chunk', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const fmt = String.fromCharCode(header[12], header[13], header[14], header[15])
      expect(fmt).toBe('fmt ')
    })

    it('should contain data chunk', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const data = String.fromCharCode(header[36], header[37], header[38], header[39])
      expect(data).toBe('data')
    })

    it('should set correct file size', () => {
      const dataLength = 1000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint32(4, true)).toBe(36 + dataLength)
    })

    it('should set PCM format (1)', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint16(20, true)).toBe(1)
    })

    it('should set correct sample rate', () => {
      const header = createWavHeader(1000, 44100, 2, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint32(24, true)).toBe(44100)
    })

    it('should set correct number of channels', () => {
      const header = createWavHeader(1000, 16000, 2, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint16(22, true)).toBe(2)
    })

    it('should set correct bits per sample', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint16(34, true)).toBe(16)
    })

    it('should calculate correct byte rate', () => {
      // byteRate = sampleRate * channels * (bitsPerSample / 8)
      const header = createWavHeader(1000, 44100, 2, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint32(28, true)).toBe(44100 * 2 * 2)
    })

    it('should calculate correct block align', () => {
      // blockAlign = channels * (bitsPerSample / 8)
      const header = createWavHeader(1000, 16000, 2, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint16(32, true)).toBe(2 * 2)
    })

    it('should set correct data size', () => {
      const dataLength = 32000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const view = new DataView(header.buffer)
      expect(view.getUint32(40, true)).toBe(dataLength)
    })
  })

  describe('createWavHeaderBuffer', () => {
    it('should create a Node.js Buffer', () => {
      const header = createWavHeaderBuffer(1000, 16000, 1, 16)
      expect(Buffer.isBuffer(header)).toBe(true)
      expect(header.length).toBe(44)
    })

    it('should produce same content as createWavHeader', () => {
      const uint8Header = createWavHeader(1000, 16000, 1, 16)
      const bufferHeader = createWavHeaderBuffer(1000, 16000, 1, 16)

      for (let i = 0; i < 44; i++) {
        expect(bufferHeader[i]).toBe(uint8Header[i])
      }
    })
  })

  describe('updateWavHeaderLength', () => {
    it('should update file size at offset 4', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      updateWavHeaderLength(header, 5000)

      const view = new DataView(header.buffer)
      expect(view.getUint32(4, true)).toBe(36 + 5000)
    })

    it('should update data size at offset 40', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      updateWavHeaderLength(header, 5000)

      const view = new DataView(header.buffer)
      expect(view.getUint32(40, true)).toBe(5000)
    })

    it('should work with Buffer', () => {
      const header = createWavHeaderBuffer(1000, 16000, 1, 16)
      updateWavHeaderLength(header, 8000)

      expect(header.readUInt32LE(4)).toBe(36 + 8000)
      expect(header.readUInt32LE(40)).toBe(8000)
    })
  })

  describe('parseWavHeader', () => {
    it('should parse a valid WAV header', () => {
      const original = createWavHeader(32000, 16000, 1, 16)
      const parsed = parseWavHeader(original)

      expect(parsed).toBeDefined()
      expect(parsed!.sampleRate).toBe(16000)
      expect(parsed!.channels).toBe(1)
      expect(parsed!.bitsPerSample).toBe(16)
      expect(parsed!.dataSize).toBe(32000)
    })

    it('should return undefined for buffer smaller than header size', () => {
      const small = new Uint8Array(20)
      expect(parseWavHeader(small)).toBeUndefined()
    })

    it('should return undefined for invalid RIFF header', () => {
      const invalid = createWavHeader(1000, 16000, 1, 16)
      invalid[0] = 0 // Corrupt RIFF
      expect(parseWavHeader(invalid)).toBeUndefined()
    })

    it('should return undefined for invalid WAVE header', () => {
      const invalid = createWavHeader(1000, 16000, 1, 16)
      invalid[8] = 0 // Corrupt WAVE
      expect(parseWavHeader(invalid)).toBeUndefined()
    })

    it('should parse stereo file correctly', () => {
      const header = createWavHeader(64000, 44100, 2, 16)
      const parsed = parseWavHeader(header)

      expect(parsed).toBeDefined()
      expect(parsed!.channels).toBe(2)
      expect(parsed!.sampleRate).toBe(44100)
    })

    it('should work with Buffer input', () => {
      const header = createWavHeaderBuffer(16000, 48000, 1, 16)
      const parsed = parseWavHeader(header)

      expect(parsed).toBeDefined()
      expect(parsed!.sampleRate).toBe(48000)
    })
  })

  describe('getWavDuration', () => {
    it('should calculate correct duration for mono 16-bit audio', () => {
      // 1 second of 16kHz mono 16-bit = 16000 * 2 = 32000 bytes
      const dataLength = 32000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const duration = getWavDuration(header)

      expect(duration).toBeCloseTo(1.0, 5)
    })

    it('should calculate correct duration for stereo audio', () => {
      // 1 second of 44100Hz stereo 16-bit = 44100 * 2 * 2 = 176400 bytes
      const dataLength = 176400
      const header = createWavHeader(dataLength, 44100, 2, 16)
      const duration = getWavDuration(header)

      expect(duration).toBeCloseTo(1.0, 5)
    })

    it('should return 0 for invalid WAV data', () => {
      const invalid = new Uint8Array(20)
      expect(getWavDuration(invalid)).toBe(0)
    })

    it('should handle 2.5 second audio correctly', () => {
      // 2.5 seconds of 16kHz mono 16-bit = 16000 * 2 * 2.5 = 80000 bytes
      const dataLength = 80000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const duration = getWavDuration(header)

      expect(duration).toBeCloseTo(2.5, 5)
    })
  })

  describe('extractWavSamples', () => {
    it('should extract samples from WAV data', () => {
      const samples = new Int16Array([0, 1000, -1000, 32767, -32768])
      const wavFile = createWavFile(samples, 16000, 1)
      const extracted = extractWavSamples(wavFile)

      expect(extracted).toBeDefined()
      expect(extracted!.length).toBe(5)
      expect(extracted![0]).toBe(0)
      expect(extracted![1]).toBe(1000)
      expect(extracted![2]).toBe(-1000)
      expect(extracted![3]).toBe(32767)
      expect(extracted![4]).toBe(-32768)
    })

    it('should return undefined for invalid WAV', () => {
      const invalid = new Uint8Array(20)
      expect(extractWavSamples(invalid)).toBeUndefined()
    })

    it('should return undefined for non-16-bit audio', () => {
      const header = createWavHeader(1000, 16000, 1, 8)
      // Manually set bitsPerSample to 8
      const view = new DataView(header.buffer)
      view.setUint16(34, 8, true)

      expect(extractWavSamples(header)).toBeUndefined()
    })

    it('should return undefined for header-only data', () => {
      const header = createWavHeader(0, 16000, 1, 16)
      expect(extractWavSamples(header)).toBeUndefined()
    })
  })

  describe('createWavFile', () => {
    it('should create a complete WAV file from Int16Array', () => {
      const samples = new Int16Array([0, 100, -100, 500, -500])
      const wavFile = createWavFile(samples, 16000, 1)

      expect(wavFile.length).toBe(44 + samples.length * 2)
    })

    it('should create a parseable WAV file', () => {
      const samples = new Int16Array([1000, 2000, 3000])
      const wavFile = createWavFile(samples, 44100, 2)

      const header = parseWavHeader(wavFile)
      expect(header).toBeDefined()
      expect(header!.sampleRate).toBe(44100)
      expect(header!.channels).toBe(2)
      expect(header!.dataSize).toBe(6)
    })

    it('should preserve sample values', () => {
      const original = new Int16Array([32767, -32768, 0, 12345, -12345])
      const wavFile = createWavFile(original, 16000, 1)
      const extracted = extractWavSamples(wavFile)

      expect(extracted).toBeDefined()
      for (let i = 0; i < original.length; i++) {
        expect(extracted![i]).toBe(original[i])
      }
    })
  })

  describe('createWavFileFromFloat', () => {
    it('should create WAV file from Float32Array', () => {
      const samples = new Float32Array([0, 0.5, -0.5, 1.0, -1.0])
      const wavFile = createWavFileFromFloat(samples, 16000, 1)

      expect(wavFile.length).toBe(44 + samples.length * 2)
    })

    it('should convert float values to 16-bit integers', () => {
      const samples = new Float32Array([0, 1.0, -1.0])
      const wavFile = createWavFileFromFloat(samples, 16000, 1)
      const extracted = extractWavSamples(wavFile)

      expect(extracted).toBeDefined()
      expect(extracted![0]).toBe(0)
      expect(extracted![1]).toBe(32767)
      expect(extracted![2]).toBe(-32767)
    })

    it('should clamp values outside [-1, 1]', () => {
      const samples = new Float32Array([2.0, -2.0, 1.5, -1.5])
      const wavFile = createWavFileFromFloat(samples, 16000, 1)
      const extracted = extractWavSamples(wavFile)

      expect(extracted).toBeDefined()
      // All values should be clamped to max/min 16-bit values
      expect(extracted![0]).toBe(32767)
      expect(extracted![1]).toBe(-32767)
      expect(extracted![2]).toBe(32767)
      expect(extracted![3]).toBe(-32767)
    })

    it('should handle small float values correctly', () => {
      const samples = new Float32Array([0.001, -0.001, 0.5, -0.5])
      const wavFile = createWavFileFromFloat(samples, 16000, 1)
      const extracted = extractWavSamples(wavFile)

      expect(extracted).toBeDefined()
      expect(extracted![0]).toBe(Math.round(0.001 * 32767))
      expect(extracted![1]).toBe(Math.round(-0.001 * 32767))
      expect(extracted![2]).toBe(Math.round(0.5 * 32767))
      expect(extracted![3]).toBe(Math.round(-0.5 * 32767))
    })
  })

  describe('roundtrip tests', () => {
    it('should preserve data through create -> parse -> extract cycle', () => {
      const original = new Int16Array(1000)
      for (let i = 0; i < 1000; i++) {
        original[i] = Math.floor(Math.random() * 65536) - 32768
      }

      const wavFile = createWavFile(original, 16000, 1)
      const header = parseWavHeader(wavFile)
      const extracted = extractWavSamples(wavFile)

      expect(header).toBeDefined()
      expect(header!.sampleRate).toBe(16000)
      expect(extracted).toBeDefined()
      expect(extracted!.length).toBe(original.length)

      for (let i = 0; i < original.length; i++) {
        expect(extracted![i]).toBe(original[i])
      }
    })

    it('should calculate correct duration after roundtrip', () => {
      // Create 0.5 second of audio
      const numSamples = 8000 // 0.5s at 16kHz
      const samples = new Int16Array(numSamples)
      const wavFile = createWavFile(samples, 16000, 1)

      const duration = getWavDuration(wavFile)
      expect(duration).toBeCloseTo(0.5, 5)
    })
  })

  describe('performance', () => {
    it('should handle large files efficiently', () => {
      // 10 seconds of 48kHz stereo = 960000 samples
      const numSamples = 480000 * 2
      const samples = new Int16Array(numSamples)

      const startCreate = performance.now()
      const wavFile = createWavFile(samples, 48000, 2)
      const createTime = performance.now() - startCreate

      const startParse = performance.now()
      parseWavHeader(wavFile)
      const parseTime = performance.now() - startParse

      const startExtract = performance.now()
      extractWavSamples(wavFile)
      const extractTime = performance.now() - startExtract

      // These should complete quickly (< 100ms each on modern hardware)
      expect(createTime).toBeLessThan(500)
      expect(parseTime).toBeLessThan(10)
      expect(extractTime).toBeLessThan(500)
    })
  })
})
