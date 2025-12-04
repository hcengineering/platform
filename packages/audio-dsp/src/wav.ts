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

/** Standard WAV header size in bytes (RIFF + fmt + data headers) */
export const WAV_HEADER_SIZE = 44

/**
 * Parsed WAV file header information
 */
export interface WavHeader {
  /** Sample rate in Hz (e.g., 16000, 44100, 48000) */
  sampleRate: number
  /** Number of audio channels (1 = mono, 2 = stereo) */
  channels: number
  /** Bits per sample (typically 8, 16, 24, or 32) */
  bitsPerSample: number
  /** Size of audio data in bytes (excluding header) */
  dataSize: number
}

/**
 * Creates a WAV file header for PCM audio data
 *
 * @param dataLength - Size of audio data in bytes
 * @param sampleRate - Sample rate in Hz (e.g., 16000, 44100)
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @param bitsPerSample - Bits per sample (typically 16)
 * @returns Buffer containing 44-byte WAV header
 *
 * @example
 * ```ts
 * // Create header for 1 second of 16kHz mono 16-bit audio
 * const dataLength = 16000 * 2 // 1 second * 2 bytes per sample
 * const header = createWavHeader(dataLength, 16000, 1, 16)
 * ```
 */
export function createWavHeader (
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Uint8Array {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const header = new Uint8Array(WAV_HEADER_SIZE)
  const view = new DataView(header.buffer)

  // RIFF header
  header.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  view.setUint32(4, 36 + dataLength, true) // File size - 8
  header.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"

  // fmt chunk
  header.set([0x66, 0x6d, 0x74, 0x20], 12) // "fmt "
  view.setUint32(16, 16, true) // fmt chunk size (16 for PCM)
  view.setUint16(20, 1, true) // Audio format (1 = PCM)
  view.setUint16(22, channels, true) // Number of channels
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample

  // data chunk
  header.set([0x64, 0x61, 0x74, 0x61], 36) // "data"
  view.setUint32(40, dataLength, true) // Data size

  return header
}

/**
 * Creates a WAV header as a Node.js Buffer (for server-side use)
 *
 * @param dataLength - Size of audio data in bytes
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels
 * @param bitsPerSample - Bits per sample
 * @returns Buffer containing 44-byte WAV header
 */
export function createWavHeaderBuffer (
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const header = Buffer.alloc(WAV_HEADER_SIZE)

  // RIFF header
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLength, 4) // File size - 8
  header.write('WAVE', 8)

  // fmt chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // Audio format (1 = PCM)
  header.writeUInt16LE(channels, 22) // Number of channels
  header.writeUInt32LE(sampleRate, 24) // Sample rate
  header.writeUInt32LE(byteRate, 28) // Byte rate
  header.writeUInt16LE(blockAlign, 32) // Block align
  header.writeUInt16LE(bitsPerSample, 34) // Bits per sample

  // data chunk
  header.write('data', 36)
  header.writeUInt32LE(dataLength, 40) // Data size

  return header
}

/**
 * Updates WAV header with correct data length in-place
 * Useful when streaming audio data and finalizing the file
 *
 * @param header - Buffer containing WAV header (at least 44 bytes)
 * @param dataLength - New data length in bytes
 */
export function updateWavHeaderLength (header: Uint8Array | Buffer, dataLength: number): void {
  if (header instanceof Buffer) {
    // For Node.js Buffer, write directly
    header.writeUInt32LE(36 + dataLength, 4)
    header.writeUInt32LE(dataLength, 40)
  } else {
    // For Uint8Array, use DataView
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
    view.setUint32(4, 36 + dataLength, true)
    view.setUint32(40, dataLength, true)
  }
}

/**
 * Parse WAV header to extract audio parameters
 *
 * @param data - WAV file data (at least 44 bytes)
 * @returns Parsed header information or undefined if invalid
 *
 * @example
 * ```ts
 * const wavData = readFileSync('audio.wav')
 * const header = parseWavHeader(wavData)
 * if (header) {
 *   console.log(`Sample rate: ${header.sampleRate}Hz`)
 *   console.log(`Duration: ${header.dataSize / header.sampleRate / (header.bitsPerSample / 8)}s`)
 * }
 * ```
 */
export function parseWavHeader (data: Uint8Array | Buffer): WavHeader | undefined {
  if (data.length < WAV_HEADER_SIZE) {
    return undefined
  }

  // Validate RIFF header
  const riff = String.fromCharCode(data[0], data[1], data[2], data[3])
  const wave = String.fromCharCode(data[8], data[9], data[10], data[11])

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return undefined
  }

  const view = new DataView(
    data instanceof Buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data.buffer
  )

  // Read format chunk
  const channels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)
  const bitsPerSample = view.getUint16(34, true)
  const dataSize = view.getUint32(40, true)

  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataSize
  }
}

/**
 * Calculate audio duration from WAV data
 *
 * @param data - WAV file data
 * @returns Duration in seconds, or 0 if unable to parse
 */
export function getWavDuration (data: Uint8Array | Buffer): number {
  const header = parseWavHeader(data)

  if (header === undefined) {
    return 0
  }

  const bytesPerSample = header.bitsPerSample / 8
  const bytesPerSecond = header.sampleRate * header.channels * bytesPerSample

  if (bytesPerSecond === 0) {
    return 0
  }

  return header.dataSize / bytesPerSecond
}

/**
 * Extract raw PCM samples from WAV data
 *
 * @param data - WAV file data
 * @returns Int16Array of samples or undefined if invalid
 */
export function extractWavSamples (data: Uint8Array | Buffer): Int16Array | undefined {
  const header = parseWavHeader(data)

  if (header === undefined || header.bitsPerSample !== 16) {
    return undefined
  }

  if (data.length <= WAV_HEADER_SIZE) {
    return undefined
  }

  const audioDataLength = data.length - WAV_HEADER_SIZE
  const sampleCount = Math.floor(audioDataLength / 2)

  // Create Int16Array from the audio data
  const samples = new Int16Array(sampleCount)

  // Calculate proper offset for DataView
  const baseOffset = data instanceof Buffer ? data.byteOffset : 0
  const view = new DataView(data.buffer, baseOffset + WAV_HEADER_SIZE, audioDataLength)

  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(i * 2, true)
  }

  return samples
}

/**
 * Create a complete WAV file from PCM samples
 *
 * @param samples - Int16Array of audio samples
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels (default: 1)
 * @returns Complete WAV file as Uint8Array
 */
export function createWavFile (samples: Int16Array, sampleRate: number, channels: number = 1): Uint8Array {
  const dataLength = samples.length * 2 // 16-bit = 2 bytes per sample
  const header = createWavHeader(dataLength, sampleRate, channels, 16)

  const result = new Uint8Array(WAV_HEADER_SIZE + dataLength)
  result.set(header, 0)

  // Copy samples to result
  const view = new DataView(result.buffer)
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(WAV_HEADER_SIZE + i * 2, samples[i], true)
  }

  return result
}

/**
 * Create a complete WAV file from Float32Array samples
 * Samples should be in range [-1.0, 1.0]
 *
 * @param samples - Float32Array of normalized audio samples
 * @param sampleRate - Sample rate in Hz
 * @param channels - Number of channels (default: 1)
 * @returns Complete WAV file as Uint8Array
 */
export function createWavFileFromFloat (samples: Float32Array, sampleRate: number, channels: number = 1): Uint8Array {
  const dataLength = samples.length * 2 // 16-bit = 2 bytes per sample
  const header = createWavHeader(dataLength, sampleRate, channels, 16)

  const result = new Uint8Array(WAV_HEADER_SIZE + dataLength)
  result.set(header, 0)

  // Convert float samples to 16-bit integers
  const view = new DataView(result.buffer)
  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] and convert to 16-bit
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    const intSample = Math.round(clamped * 32767)
    view.setInt16(WAV_HEADER_SIZE + i * 2, intSample, true)
  }

  return result
}
