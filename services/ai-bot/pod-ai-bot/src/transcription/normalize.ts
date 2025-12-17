// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import {
  WAV_HEADER_SIZE,
  parseWavHeader,
  extractWavSamples,
  getAudioStats as getAudioStatsDsp,
  normalizeAudio as normalizeAudioDsp,
  createWavFileFromFloat
} from '@hcengineering/audio-dsp'

/** Target RMS level for normalization */
const TARGET_RMS = 0.2

/** Target peak level for normalization (prevents clipping) */
const TARGET_PEAK = 0.95

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

  // Extract samples using audio-dsp library (returns Int16Array)
  const samples = extractWavSamples(wavBuffer)

  if (samples === undefined || samples.length === 0) {
    return wavBuffer
  }

  // Use audio-dsp library for normalization
  // normalizeAudioDsp handles Int16Array internally and returns Float32Array
  const normalizedSamples = normalizeAudioDsp(samples, {
    targetRms: TARGET_RMS,
    targetPeak: TARGET_PEAK
  })

  // Check if normalization made any significant change
  // Compare first few samples (normalizedSamples is already normalized 0-1 scale)
  let unchanged = true
  for (let i = 0; i < Math.min(100, samples.length); i++) {
    const originalNormalized = samples[i] / 32768
    if (Math.abs(originalNormalized - normalizedSamples[i]) > 0.001) {
      unchanged = false
      break
    }
  }

  if (unchanged) {
    return wavBuffer
  }

  // Create new WAV file from normalized samples
  const normalizedWav = createWavFileFromFloat(normalizedSamples, header.sampleRate, header.channels)

  return Buffer.from(normalizedWav)
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

  // Extract samples using audio-dsp library (returns Int16Array)
  const samples = extractWavSamples(wavBuffer)

  if (samples === undefined || samples.length === 0) {
    return undefined
  }

  // Use audio-dsp library for stats calculation
  // getAudioStatsDsp handles Int16Array internally
  const stats = getAudioStatsDsp(samples)

  if (stats.rms < Number.EPSILON || stats.peak < Number.EPSILON) {
    return { rms: 0, peak: 0, suggestedScaling: 1 }
  }

  const rmsScaling = TARGET_RMS / stats.rms
  const peakScaling = TARGET_PEAK / stats.peak
  const suggestedScaling = Math.min(rmsScaling, peakScaling)

  return {
    rms: stats.rms,
    peak: stats.peak,
    suggestedScaling
  }
}
