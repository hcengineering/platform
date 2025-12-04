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

/**
 * Audio normalization utilities
 *
 * Provides functions for normalizing audio levels while preserving dynamics.
 */

import { parseWavHeader, createWavFile, WAV_HEADER_SIZE } from './wav'

/** Default target RMS level for normalization */
const DEFAULT_TARGET_RMS = 0.2

/** Default target peak level for normalization (prevents clipping) */
const DEFAULT_TARGET_PEAK = 0.95

/**
 * Configuration for audio normalization
 */
export interface NormalizationConfig {
  /** Target RMS level (default: 0.2) */
  targetRms: number
  /** Target peak level to prevent clipping (default: 0.95) */
  targetPeak: number
  /** Minimum scaling threshold - if scaling is within this of 1.0, skip normalization */
  skipThreshold: number
}

/**
 * Audio statistics
 */
export interface AudioStats {
  /** Root Mean Square amplitude (0-1) */
  rms: number
  /** Peak amplitude (0-1) */
  peak: number
  /** Suggested scaling factor to reach target levels */
  suggestedScaling: number
  /** DC offset (average of samples) */
  dcOffset: number
  /** Dynamic range in dB */
  dynamicRangeDb: number
}

/**
 * Default normalization configuration
 */
export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = {
  targetRms: DEFAULT_TARGET_RMS,
  targetPeak: DEFAULT_TARGET_PEAK,
  skipThreshold: 0.01
}

/**
 * Calculate audio statistics without modifying the samples
 *
 * @param samples - Audio samples (Int16Array or Float32Array)
 * @param config - Normalization configuration for calculating suggested scaling
 * @returns Audio statistics
 */
export function getAudioStats (
  samples: Int16Array | Float32Array | Float64Array,
  config: Partial<NormalizationConfig> = {}
): AudioStats {
  const { targetRms, targetPeak } = { ...DEFAULT_NORMALIZATION_CONFIG, ...config }

  if (samples.length === 0) {
    return {
      rms: 0,
      peak: 0,
      suggestedScaling: 1,
      dcOffset: 0,
      dynamicRangeDb: 0
    }
  }

  const isInt16 = samples instanceof Int16Array

  let sumSquares = 0
  let sum = 0
  let peak = 0
  let minSample = Number.POSITIVE_INFINITY
  let maxSample = Number.NEGATIVE_INFINITY

  for (let i = 0; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    const absSample = Math.abs(sample)

    sumSquares += sample * sample
    sum += sample

    if (absSample > peak) {
      peak = absSample
    }
    if (sample < minSample) {
      minSample = sample
    }
    if (sample > maxSample) {
      maxSample = sample
    }
  }

  const rms = Math.sqrt(sumSquares / samples.length)
  const dcOffset = sum / samples.length

  // Calculate dynamic range
  let dynamicRangeDb = 0
  if (rms > 0 && peak > 0) {
    const rmsDb = 20 * Math.log10(rms)
    const peakDb = 20 * Math.log10(peak)
    dynamicRangeDb = peakDb - rmsDb
  }

  // Calculate suggested scaling
  let suggestedScaling = 1
  if (rms > Number.EPSILON && peak > Number.EPSILON) {
    const rmsScaling = targetRms / rms
    const peakScaling = targetPeak / peak
    suggestedScaling = Math.min(rmsScaling, peakScaling)
  }

  return {
    rms,
    peak,
    suggestedScaling,
    dcOffset,
    dynamicRangeDb
  }
}

/**
 * Normalize audio samples to target RMS and peak levels
 *
 * @param samples - Audio samples (will not be modified)
 * @param config - Normalization configuration
 * @returns Normalized samples as Float32Array
 */
export function normalizeAudio (
  samples: Int16Array | Float32Array | Float64Array,
  config: Partial<NormalizationConfig> = {}
): Float32Array {
  const { targetRms, targetPeak, skipThreshold } = { ...DEFAULT_NORMALIZATION_CONFIG, ...config }

  if (samples.length === 0) {
    return new Float32Array(0)
  }

  const isInt16 = samples instanceof Int16Array

  // First pass: calculate RMS and peak
  let sumSquares = 0
  let peak = 0

  for (let i = 0; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    sumSquares += sample * sample
    const absSample = Math.abs(sample)
    if (absSample > peak) {
      peak = absSample
    }
  }

  const rms = Math.sqrt(sumSquares / samples.length)

  // Check if audio is completely silent
  if (rms < Number.EPSILON || peak < Number.EPSILON) {
    // Return copy without modification
    const result = new Float32Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      result[i] = isInt16 ? samples[i] / 32768 : samples[i]
    }
    return result
  }

  // Calculate scaling factors
  const rmsScaling = targetRms / rms
  const peakScaling = targetPeak / peak

  // Use minimum to preserve dynamics and prevent clipping
  const scalingFactor = Math.min(rmsScaling, peakScaling)

  // Skip normalization if scaling is very close to 1.0
  if (Math.abs(scalingFactor - 1.0) < skipThreshold) {
    const result = new Float32Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      result[i] = isInt16 ? samples[i] / 32768 : samples[i]
    }
    return result
  }

  // Second pass: apply normalization
  const result = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    // Apply scaling and clamp to valid range
    result[i] = Math.max(-1, Math.min(1, sample * scalingFactor))
  }

  return result
}

/**
 * Normalize audio with DC offset removal
 *
 * @param samples - Audio samples
 * @param config - Normalization configuration
 * @returns Normalized samples with DC offset removed
 */
export function normalizeAudioWithDcRemoval (
  samples: Int16Array | Float32Array | Float64Array,
  config: Partial<NormalizationConfig> = {}
): Float32Array {
  if (samples.length === 0) {
    return new Float32Array(0)
  }

  const isInt16 = samples instanceof Int16Array

  // Calculate DC offset
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += isInt16 ? samples[i] / 32768 : samples[i]
  }
  const dcOffset = sum / samples.length

  // Remove DC offset and convert to Float32Array
  const dcRemoved = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    dcRemoved[i] = (isInt16 ? samples[i] / 32768 : samples[i]) - dcOffset
  }

  // Normalize the DC-corrected samples
  return normalizeAudio(dcRemoved, config)
}

/**
 * Normalize WAV file data
 *
 * @param wavData - WAV file data (with header)
 * @param config - Normalization configuration
 * @returns Normalized WAV file data
 */
export function normalizeWav (
  wavData: Uint8Array | Buffer,
  config: Partial<NormalizationConfig> = {}
): Uint8Array {
  const header = parseWavHeader(wavData)

  if (header === undefined) {
    throw new Error('Invalid WAV file')
  }

  if (header.bitsPerSample !== 16) {
    throw new Error('Only 16-bit WAV files are supported')
  }

  if (wavData.length <= WAV_HEADER_SIZE) {
    // No audio data, return as is
    return new Uint8Array(wavData)
  }

  // Extract samples
  const audioData = wavData.subarray(WAV_HEADER_SIZE)
  const sampleCount = Math.floor(audioData.length / 2)
  const samples = new Int16Array(sampleCount)

  const audioDataArray = audioData instanceof Uint8Array ? audioData : new Uint8Array(audioData)
  const view = new DataView(
    audioDataArray.buffer.slice(audioDataArray.byteOffset, audioDataArray.byteOffset + audioDataArray.byteLength)
  )

  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(i * 2, true)
  }

  // Normalize
  const normalized = normalizeAudio(samples, config)

  // Convert back to Int16Array
  const outputSamples = new Int16Array(normalized.length)
  for (let i = 0; i < normalized.length; i++) {
    outputSamples[i] = Math.round(normalized[i] * 32767)
  }

  // Create WAV file
  return createWavFile(outputSamples, header.sampleRate, header.channels)
}

/**
 * Apply peak limiting to prevent clipping
 *
 * @param samples - Audio samples
 * @param threshold - Threshold above which to limit (default: 0.95)
 * @param ratio - Compression ratio for limiting (default: 10)
 * @returns Limited samples
 */
export function peakLimit (
  samples: Float32Array | Float64Array,
  threshold: number = 0.95,
  ratio: number = 10
): Float32Array {
  const result = new Float32Array(samples.length)

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    const absSample = Math.abs(sample)
    const sign = sample >= 0 ? 1 : -1

    if (absSample > threshold) {
      // Soft-knee compression above threshold
      const excess = absSample - threshold
      const compressed = threshold + excess / ratio
      result[i] = sign * Math.min(compressed, 1.0)
    } else {
      result[i] = sample
    }
  }

  return result
}

/**
 * Apply gain to audio samples
 *
 * @param samples - Audio samples
 * @param gainDb - Gain in decibels
 * @returns Gained samples (clamped to -1, 1)
 */
export function applyGain (
  samples: Float32Array | Float64Array,
  gainDb: number
): Float32Array {
  const gainLinear = Math.pow(10, gainDb / 20)
  const result = new Float32Array(samples.length)

  for (let i = 0; i < samples.length; i++) {
    result[i] = Math.max(-1, Math.min(1, samples[i] * gainLinear))
  }

  return result
}

/**
 * Calculate gain needed to reach target peak level
 *
 * @param samples - Audio samples
 * @param targetPeak - Target peak level (default: 0.95)
 * @returns Gain in dB needed to reach target
 */
export function calculateGainToTarget (
  samples: Float32Array | Float64Array | Int16Array,
  targetPeak: number = 0.95
): number {
  if (samples.length === 0) return 0

  const isInt16 = samples instanceof Int16Array
  let peak = 0

  for (let i = 0; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    const absSample = Math.abs(sample)
    if (absSample > peak) {
      peak = absSample
    }
  }

  if (peak < Number.EPSILON) return 0

  return 20 * Math.log10(targetPeak / peak)
}
