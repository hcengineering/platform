//
// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)
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

import { createWavHeader, sanitizePath } from '../stream/wav-utils'

describe('WAV Utilities', () => {
  describe('createWavHeader', () => {
    it('should create a 44-byte header', () => {
      const header = createWavHeader(1000, 16000, 1, 16)

      expect(header).toBeInstanceOf(Buffer)
      expect(header.length).toBe(44)
    })

    it('should contain RIFF identifier', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const riff = header.toString('ascii', 0, 4)

      expect(riff).toBe('RIFF')
    })

    it('should contain WAVE identifier', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const wave = header.toString('ascii', 8, 12)

      expect(wave).toBe('WAVE')
    })

    it('should contain fmt chunk', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const fmt = header.toString('ascii', 12, 16)

      expect(fmt).toBe('fmt ')
    })

    it('should contain data chunk', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const data = header.toString('ascii', 36, 40)

      expect(data).toBe('data')
    })

    it('should set correct file size', () => {
      const dataLength = 1000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const fileSize = header.readUInt32LE(4)

      expect(fileSize).toBe(36 + dataLength)
    })

    it('should set PCM format (1)', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const format = header.readUInt16LE(20)

      expect(format).toBe(1)
    })

    it('should set correct sample rate', () => {
      const header = createWavHeader(1000, 44100, 2, 16)
      const sampleRate = header.readUInt32LE(24)

      expect(sampleRate).toBe(44100)
    })

    it('should set correct number of channels', () => {
      const header = createWavHeader(1000, 16000, 2, 16)
      const channels = header.readUInt16LE(22)

      expect(channels).toBe(2)
    })

    it('should set correct bits per sample', () => {
      const header = createWavHeader(1000, 16000, 1, 16)
      const bitsPerSample = header.readUInt16LE(34)

      expect(bitsPerSample).toBe(16)
    })

    it('should calculate correct byte rate', () => {
      // byteRate = sampleRate * channels * (bitsPerSample / 8)
      const header = createWavHeader(1000, 44100, 2, 16)
      const byteRate = header.readUInt32LE(28)

      expect(byteRate).toBe(44100 * 2 * 2)
    })

    it('should calculate correct block align', () => {
      // blockAlign = channels * (bitsPerSample / 8)
      const header = createWavHeader(1000, 16000, 2, 16)
      const blockAlign = header.readUInt16LE(32)

      expect(blockAlign).toBe(2 * 2)
    })

    it('should set correct data size', () => {
      const dataLength = 32000
      const header = createWavHeader(dataLength, 16000, 1, 16)
      const dataSize = header.readUInt32LE(40)

      expect(dataSize).toBe(dataLength)
    })

    it('should handle different sample rates', () => {
      const sampleRates = [8000, 16000, 22050, 44100, 48000]

      for (const rate of sampleRates) {
        const header = createWavHeader(1000, rate, 1, 16)
        expect(header.readUInt32LE(24)).toBe(rate)
      }
    })

    it('should handle mono and stereo', () => {
      const monoHeader = createWavHeader(1000, 16000, 1, 16)
      const stereoHeader = createWavHeader(1000, 16000, 2, 16)

      expect(monoHeader.readUInt16LE(22)).toBe(1)
      expect(stereoHeader.readUInt16LE(22)).toBe(2)
    })

    it('should handle zero data length', () => {
      const header = createWavHeader(0, 16000, 1, 16)

      expect(header.length).toBe(44)
      expect(header.readUInt32LE(4)).toBe(36) // File size = 36 + 0
      expect(header.readUInt32LE(40)).toBe(0) // Data size = 0
    })

    it('should handle large data lengths', () => {
      const largeLength = 100000000 // 100MB
      const header = createWavHeader(largeLength, 16000, 1, 16)

      expect(header.readUInt32LE(4)).toBe(36 + largeLength)
      expect(header.readUInt32LE(40)).toBe(largeLength)
    })
  })

  describe('sanitizePath', () => {
    it('should replace spaces with underscores', () => {
      expect(sanitizePath('hello world')).toBe('hello_world')
      // \s+ replaces consecutive whitespace with single underscore
      expect(sanitizePath('hello  world')).toBe('hello_world')
      expect(sanitizePath('  test  ')).toBe('_test_')
    })

    it('should replace special characters with underscores', () => {
      expect(sanitizePath('file<test>')).toBe('file_test_')
      expect(sanitizePath('file:test')).toBe('file_test')
      expect(sanitizePath('file"test"')).toBe('file_test_')
      expect(sanitizePath('file/test')).toBe('file_test')
      expect(sanitizePath('file\\test')).toBe('file_test')
      expect(sanitizePath('file|test')).toBe('file_test')
      expect(sanitizePath('file?test')).toBe('file_test')
      expect(sanitizePath('file*test')).toBe('file_test')
      expect(sanitizePath('file,test')).toBe('file_test')
      expect(sanitizePath('Last, First')).toBe('Last__First')
    })

    it('should handle combined spaces and special characters', () => {
      // Space replaced first by \s+, then : replaced by special char regex
      expect(sanitizePath('hello world: test')).toBe('hello_world__test')
      expect(sanitizePath('user <email>')).toBe('user__email_')
    })

    it('should preserve valid characters', () => {
      expect(sanitizePath('valid_name-123')).toBe('valid_name-123')
      expect(sanitizePath('test.wav')).toBe('test.wav')
      expect(sanitizePath('user@example')).toBe('user@example')
    })

    it('should handle empty string', () => {
      expect(sanitizePath('')).toBe('')
    })

    it('should handle string with only special characters', () => {
      expect(sanitizePath('<>:"/\\|?*')).toBe('_________')
    })

    it('should handle unicode characters', () => {
      // Unicode letters should be preserved
      expect(sanitizePath('тест')).toBe('тест')
      expect(sanitizePath('用户')).toBe('用户')
      expect(sanitizePath('日本語 test')).toBe('日本語_test')
    })

    it('should handle realistic participant names', () => {
      expect(sanitizePath('John Doe')).toBe('John_Doe')
      expect(sanitizePath('user@company.com')).toBe('user@company.com')
      expect(sanitizePath('User: Admin')).toBe('User__Admin')
      expect(sanitizePath('Test (Guest)')).toBe('Test_(Guest)')
    })

    it('should handle tab and newline characters', () => {
      expect(sanitizePath('hello\tworld')).toBe('hello_world')
      expect(sanitizePath('hello\nworld')).toBe('hello_world')
      // \r\n is two whitespace chars, \s+ replaces them with single _
      expect(sanitizePath('hello\r\nworld')).toBe('hello_world')
    })

    it('should handle multiple consecutive special characters', () => {
      expect(sanitizePath('a<>b')).toBe('a__b')
      expect(sanitizePath('a***b')).toBe('a___b')
    })
  })

  describe('Header structure validation', () => {
    it('should have correct chunk sizes', () => {
      const header = createWavHeader(1000, 16000, 1, 16)

      // fmt chunk size should be 16 for PCM
      const fmtChunkSize = header.readUInt32LE(16)
      expect(fmtChunkSize).toBe(16)
    })

    it('should create valid header for typical speech recording', () => {
      // 1 second of 16kHz mono 16-bit audio = 32000 bytes
      const dataLength = 32000
      const header = createWavHeader(dataLength, 16000, 1, 16)

      // Verify all fields are consistent
      expect(header.readUInt32LE(4)).toBe(36 + dataLength) // File size - 8
      expect(header.readUInt16LE(20)).toBe(1) // PCM format
      expect(header.readUInt16LE(22)).toBe(1) // Mono
      expect(header.readUInt32LE(24)).toBe(16000) // Sample rate
      expect(header.readUInt32LE(28)).toBe(32000) // Byte rate
      expect(header.readUInt16LE(32)).toBe(2) // Block align
      expect(header.readUInt16LE(34)).toBe(16) // Bits per sample
      expect(header.readUInt32LE(40)).toBe(dataLength) // Data size
    })

    it('should create valid header for high quality recording', () => {
      // 1 second of 48kHz stereo 16-bit audio = 192000 bytes
      const dataLength = 192000
      const header = createWavHeader(dataLength, 48000, 2, 16)

      expect(header.readUInt16LE(22)).toBe(2) // Stereo
      expect(header.readUInt32LE(24)).toBe(48000) // Sample rate
      expect(header.readUInt32LE(28)).toBe(192000) // Byte rate = 48000 * 2 * 2
      expect(header.readUInt16LE(32)).toBe(4) // Block align = 2 * 2
    })
  })

  describe('Edge cases', () => {
    it('should handle 8-bit audio', () => {
      const header = createWavHeader(1000, 16000, 1, 8)

      expect(header.readUInt16LE(34)).toBe(8)
      expect(header.readUInt32LE(28)).toBe(16000) // Byte rate = 16000 * 1 * 1
      expect(header.readUInt16LE(32)).toBe(1) // Block align = 1 * 1
    })

    it('should handle 24-bit audio', () => {
      const header = createWavHeader(1000, 48000, 2, 24)

      expect(header.readUInt16LE(34)).toBe(24)
      expect(header.readUInt32LE(28)).toBe(288000) // Byte rate = 48000 * 2 * 3
      expect(header.readUInt16LE(32)).toBe(6) // Block align = 2 * 3
    })

    it('should handle 32-bit audio', () => {
      const header = createWavHeader(1000, 44100, 2, 32)

      expect(header.readUInt16LE(34)).toBe(32)
      expect(header.readUInt32LE(28)).toBe(352800) // Byte rate = 44100 * 2 * 4
      expect(header.readUInt16LE(32)).toBe(8) // Block align = 2 * 4
    })
  })
})
