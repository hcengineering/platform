// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { parseWavHeader } from './vad'

/** Target RMS level for normalization */
const TARGET_RMS = 0.2

/** Target peak level for normalization (prevents clipping) */
const TARGET_PEAK = 0.95

/** WAV header size in bytes */
const WAV_HEADER_SIZE = 44

/**
 * Normalizes audio samples to target RMS and peak levels while preserving dynamics.
 *
 * The function normalizes audio by:
 * 1. Computing RMS (Root Mean Square) and peak values
 * 2. Calculating scaling factors to reach target levels
 * 3. Applying the minimum of RMS and peak scaling to preserve dynamics
 *
 * @param wavBuffer - Complete WAV file buffer (16-bit PCM with header)
 * @returns Normalized WAV buffer, or original if normalization not possible
 */
export function normalizeAudio (wavBuffer: Buffer): Buffer {
  const header = parseWavHeader(wavBuffer)

  if (header === undefined || header.bitsPerSample !== 16) {
    // Return original if we can't parse or unsupported format
    return wavBuffer
  }

  if (wavBuffer.length <= WAV_HEADER_SIZE) {
    return wavBuffer
  }

  const audioData = wavBuffer.subarray(WAV_HEADER_SIZE)
  const sampleCount = Math.floor(audioData.length / 2)

  if (sampleCount === 0) {
    return wavBuffer
  }

  // First pass: compute RMS and peak
  let sumSquares = 0
  let peak = 0

  for (let i = 0; i < audioData.length - 1; i += 2) {
    const sample = audioData.readInt16LE(i)
    // Normalize to [-1.0, 1.0] range
    const normalized = sample / 32768
    sumSquares += normalized * normalized
    const absSample = Math.abs(normalized)
    if (absSample > peak) {
      peak = absSample
    }
  }

  const rms = Math.sqrt(sumSquares / sampleCount)

  // Return original if audio is completely silent
  if (rms < Number.EPSILON || peak < Number.EPSILON) {
    return wavBuffer
  }

  // Calculate scaling factors
  const rmsScaling = TARGET_RMS / rms
  const peakScaling = TARGET_PEAK / peak

  // Use minimum to preserve dynamics and prevent clipping
  const scalingFactor = Math.min(rmsScaling, peakScaling)

  // Skip normalization if scaling is very close to 1.0 (already normalized)
  if (Math.abs(scalingFactor - 1.0) < 0.01) {
    return wavBuffer
  }

  // Create new buffer with normalized audio
  const result = Buffer.alloc(wavBuffer.length)

  // Copy header unchanged
  wavBuffer.copy(result, 0, 0, WAV_HEADER_SIZE)

  // Second pass: apply normalization
  for (let i = 0; i < audioData.length - 1; i += 2) {
    const sample = audioData.readInt16LE(i)
    // Apply scaling
    let normalizedSample = sample * scalingFactor

    // Clamp to valid 16-bit range
    normalizedSample = Math.max(-32768, Math.min(32767, normalizedSample))

    // Write back as 16-bit signed integer
    result.writeInt16LE(Math.round(normalizedSample), WAV_HEADER_SIZE + i)
  }

  return result
}

/**
 * Get audio statistics without modifying the buffer
 *
 * @param wavBuffer - Complete WAV file buffer
 * @returns Audio statistics or undefined if parsing fails
 */
export function getAudioStats (wavBuffer: Buffer):
| {
  rms: number
  peak: number
  suggestedScaling: number
}
| undefined {
  const header = parseWavHeader(wavBuffer)

  if (header === undefined || header.bitsPerSample !== 16) {
    return undefined
  }

  if (wavBuffer.length <= WAV_HEADER_SIZE) {
    return undefined
  }

  const audioData = wavBuffer.subarray(WAV_HEADER_SIZE)
  const sampleCount = Math.floor(audioData.length / 2)

  if (sampleCount === 0) {
    return undefined
  }

  let sumSquares = 0
  let peak = 0

  for (let i = 0; i < audioData.length - 1; i += 2) {
    const sample = audioData.readInt16LE(i)
    const normalized = sample / 32768
    sumSquares += normalized * normalized
    const absSample = Math.abs(normalized)
    if (absSample > peak) {
      peak = absSample
    }
  }

  const rms = Math.sqrt(sumSquares / sampleCount)

  if (rms < Number.EPSILON || peak < Number.EPSILON) {
    return { rms: 0, peak: 0, suggestedScaling: 1 }
  }

  const rmsScaling = TARGET_RMS / rms
  const peakScaling = TARGET_PEAK / peak
  const suggestedScaling = Math.min(rmsScaling, peakScaling)

  return {
    rms,
    peak,
    suggestedScaling
  }
}
