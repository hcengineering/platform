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
 * Audio analysis utilities for Voice Activity Detection (VAD) and audio metrics
 */

import { fft, magnitude } from './fft'

/**
 * Result of audio analysis for a single frame/buffer
 */
export interface AudioAnalysis {
  /** Root Mean Square amplitude (0-1 normalized) */
  rms: number
  /** Peak amplitude (0-1 normalized) */
  peak: number
  /** Number of samples above activity threshold */
  activeSamples: number
  /** Total number of samples analyzed */
  totalSamples: number
  /** Sum of squares (for RMS calculation across multiple frames) */
  sumSquares: number
  /** Zero-crossing rate (frequency of sign changes, speech typically 0.1-0.3) */
  zeroCrossingRate: number
  /** Energy in speech band (300-3400 Hz, normalized 0-1) */
  lowBandEnergy: number
  /** Energy in high frequencies (3400-8000 Hz, normalized 0-1) */
  highBandEnergy: number
  /** Spectral centroid - center of mass of spectrum in Hz (speech typically 500-2000 Hz) */
  spectralCentroid: number
  /** Spectral flux - change in spectrum from previous frame (onset detection) */
  spectralFlux: number
  /** Cached magnitude spectrum for flux calculation */
  spectrum: Float64Array | null
}

/**
 * VAD (Voice Activity Detection) result
 */
export interface VadResult {
  /** Whether speech was detected */
  hasSpeech: boolean
  /** Ratio of active samples to total (0-1) */
  speechRatio: number
  /** RMS amplitude (0-1 normalized) */
  rmsAmplitude: number
  /** Peak amplitude (0-1 normalized) */
  peakAmplitude: number
}

/**
 * Spectral analysis result
 */
export interface SpectralFeatures {
  /** Energy in speech band (300-3400 Hz, normalized) */
  lowBandEnergy: number
  /** Energy in high frequencies (3400-8000 Hz, normalized) */
  highBandEnergy: number
  /** Spectral centroid in Hz */
  spectralCentroid: number
  /** Magnitude spectrum */
  spectrum: Float64Array
}

// Default thresholds for VAD
const DEFAULT_VAD_RMS_THRESHOLD = 0.02
const DEFAULT_VAD_SPEECH_RATIO_THRESHOLD = 0.1
const DEFAULT_SAMPLE_ACTIVITY_THRESHOLD = 0.015

// Frequency bands for speech detection (assuming 16kHz sample rate)
const SPEECH_BAND_LOW = 300 // Hz - lower bound of speech band
const SPEECH_BAND_HIGH = 3400 // Hz - upper bound of speech band
const HIGH_BAND_LOW = 3400 // Hz - lower bound of high frequency band
const HIGH_BAND_HIGH = 8000 // Hz - upper bound of high frequency band

// Spectral centroid thresholds for speech detection
const SPEECH_CENTROID_MIN = 400 // Hz
const SPEECH_CENTROID_MAX = 3000 // Hz

/**
 * Analyze audio buffer and calculate various metrics
 *
 * @param samples - Audio samples as Int16Array or Float32Array
 * @param sampleRate - Sample rate in Hz (default: 16000)
 * @param previousSpectrum - Previous frame's spectrum for flux calculation
 * @returns Audio analysis result
 */
export function analyzeAudio (
  samples: Int16Array | Float32Array | Float64Array,
  sampleRate: number = 16000,
  previousSpectrum: Float64Array | null = null
): AudioAnalysis {
  const sampleCount = samples.length

  if (sampleCount === 0) {
    return {
      rms: 0,
      peak: 0,
      activeSamples: 0,
      totalSamples: 0,
      sumSquares: 0,
      zeroCrossingRate: 0,
      lowBandEnergy: 0,
      highBandEnergy: 0,
      spectralCentroid: 0,
      spectralFlux: 0,
      spectrum: null
    }
  }

  // Normalize samples to Float64Array in range [-1, 1]
  const normalized = new Float64Array(sampleCount)
  const isInt16 = samples instanceof Int16Array

  let sumSquares = 0
  let peak = 0
  let activeSamples = 0
  let zeroCrossings = 0
  let previousSample = 0

  for (let i = 0; i < sampleCount; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    normalized[i] = sample

    const absSample = Math.abs(sample)
    sumSquares += sample * sample

    if (absSample > peak) {
      peak = absSample
    }

    if (absSample > DEFAULT_SAMPLE_ACTIVITY_THRESHOLD) {
      activeSamples++
    }

    // Zero-crossing detection
    if (i > 0 && ((previousSample >= 0 && sample < 0) || (previousSample < 0 && sample >= 0))) {
      zeroCrossings++
    }
    previousSample = sample
  }

  const rms = Math.sqrt(sumSquares / sampleCount)
  const zeroCrossingRate = zeroCrossings / sampleCount

  // Calculate spectral features
  const spectralFeatures = calculateSpectralFeatures(normalized, sampleRate)

  // Calculate spectral flux
  let spectralFlux = 0
  if (previousSpectrum !== null && spectralFeatures.spectrum.length === previousSpectrum.length) {
    for (let i = 0; i < spectralFeatures.spectrum.length; i++) {
      const diff = spectralFeatures.spectrum[i] - previousSpectrum[i]
      if (diff > 0) {
        spectralFlux += diff // Only positive changes (onset detection)
      }
    }
    spectralFlux /= spectralFeatures.spectrum.length
  }

  return {
    rms,
    peak,
    activeSamples,
    totalSamples: sampleCount,
    sumSquares,
    zeroCrossingRate,
    lowBandEnergy: spectralFeatures.lowBandEnergy,
    highBandEnergy: spectralFeatures.highBandEnergy,
    spectralCentroid: spectralFeatures.spectralCentroid,
    spectralFlux,
    spectrum: spectralFeatures.spectrum
  }
}

/**
 * Analyze audio from a Buffer containing 16-bit PCM data
 *
 * @param buffer - Buffer containing 16-bit PCM audio data (no header)
 * @param sampleRate - Sample rate in Hz
 * @param previousSpectrum - Previous frame's spectrum for flux calculation
 * @returns Audio analysis result
 */
export function analyzeAudioBuffer (
  buffer: Uint8Array | Buffer,
  sampleRate: number = 16000,
  previousSpectrum: Float64Array | null = null
): AudioAnalysis {
  const sampleCount = Math.floor(buffer.length / 2)
  const samples = new Int16Array(sampleCount)

  // Read 16-bit little-endian samples
  const bufferArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const view = new DataView(
    bufferArray.buffer.slice(bufferArray.byteOffset, bufferArray.byteOffset + bufferArray.byteLength)
  )

  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(i * 2, true)
  }

  return analyzeAudio(samples, sampleRate, previousSpectrum)
}

/**
 * Calculate spectral features using FFT
 *
 * @param samples - Normalized audio samples (-1 to 1)
 * @param sampleRate - Sample rate in Hz
 * @returns Spectral features
 */
export function calculateSpectralFeatures (
  samples: Float64Array | Float32Array,
  sampleRate: number
): SpectralFeatures {
  // Compute FFT
  const { real, imag } = fft(samples)
  const spectrum = magnitude(real, imag)

  // Only use first half of spectrum (positive frequencies)
  const halfSize = spectrum.length / 2
  const binWidth = sampleRate / spectrum.length

  // Calculate frequency bin ranges
  const speechLowBin = Math.floor(SPEECH_BAND_LOW / binWidth)
  const speechHighBin = Math.min(Math.ceil(SPEECH_BAND_HIGH / binWidth), halfSize - 1)
  const highLowBin = Math.floor(HIGH_BAND_LOW / binWidth)
  const highHighBin = Math.min(Math.ceil(HIGH_BAND_HIGH / binWidth), halfSize - 1)

  let totalEnergy = 0
  let speechBandEnergy = 0
  let highBandEnergy = 0
  let weightedFrequencySum = 0
  let totalMagnitude = 0

  for (let k = 0; k < halfSize; k++) {
    const frequency = k * binWidth
    const mag = spectrum[k]
    const magSquared = mag * mag

    totalEnergy += magSquared
    totalMagnitude += mag
    weightedFrequencySum += frequency * mag

    // Accumulate band energies
    if (k >= speechLowBin && k <= speechHighBin) {
      speechBandEnergy += magSquared
    }
    if (k >= highLowBin && k <= highHighBin) {
      highBandEnergy += magSquared
    }
  }

  // Normalize energies relative to total
  const lowBandEnergyNorm = totalEnergy > 0 ? speechBandEnergy / totalEnergy : 0
  const highBandEnergyNorm = totalEnergy > 0 ? highBandEnergy / totalEnergy : 0

  // Spectral centroid (center of mass of spectrum in Hz)
  const spectralCentroid = totalMagnitude > 0 ? weightedFrequencySum / totalMagnitude : 0

  return {
    lowBandEnergy: lowBandEnergyNorm,
    highBandEnergy: highBandEnergyNorm,
    spectralCentroid,
    spectrum
  }
}

/**
 * Simple Voice Activity Detection (VAD)
 *
 * @param samples - Audio samples
 * @param rmsThreshold - RMS threshold for speech detection (default: 0.02)
 * @param speechRatioThreshold - Minimum ratio of active samples (default: 0.1)
 * @returns VAD result
 */
export function detectVoiceActivity (
  samples: Int16Array | Float32Array | Float64Array,
  rmsThreshold: number = DEFAULT_VAD_RMS_THRESHOLD,
  speechRatioThreshold: number = DEFAULT_VAD_SPEECH_RATIO_THRESHOLD
): VadResult {
  const analysis = analyzeAudio(samples)

  const speechRatio = analysis.totalSamples > 0 ? analysis.activeSamples / analysis.totalSamples : 0
  const hasSpeech = analysis.rms > rmsThreshold || speechRatio > speechRatioThreshold

  return {
    hasSpeech,
    speechRatio,
    rmsAmplitude: analysis.rms,
    peakAmplitude: analysis.peak
  }
}

/**
 * Advanced Voice Activity Detection using multiple features
 *
 * @param analysis - Pre-computed audio analysis
 * @param rmsThreshold - RMS threshold for speech detection
 * @param speechRatioThreshold - Minimum ratio of active samples
 * @returns Whether the frame contains speech
 */
export function isFrameSpeech (
  analysis: AudioAnalysis,
  rmsThreshold: number = DEFAULT_VAD_RMS_THRESHOLD,
  speechRatioThreshold: number = DEFAULT_VAD_SPEECH_RATIO_THRESHOLD
): boolean {
  const speechRatio = analysis.totalSamples > 0 ? analysis.activeSamples / analysis.totalSamples : 0

  // Primary criteria: RMS above threshold
  const rmsAboveThreshold = analysis.rms > rmsThreshold

  // Secondary criteria: sufficient activity ratio
  const sufficientActivity = speechRatio > speechRatioThreshold

  // Spectral criteria
  const zcrInSpeechRange = analysis.zeroCrossingRate >= 0.05 && analysis.zeroCrossingRate <= 0.5

  // Speech band should be dominant
  const speechBandDominant = analysis.lowBandEnergy > 0.3

  // Spectral centroid should be in speech range
  const centroidInSpeechRange =
    analysis.spectralCentroid >= SPEECH_CENTROID_MIN && analysis.spectralCentroid <= SPEECH_CENTROID_MAX

  // Low to high band ratio (speech has more low frequency energy)
  const lowHighBandRatio = analysis.highBandEnergy > 0 ? analysis.lowBandEnergy / analysis.highBandEnergy : 10

  // Spectral flux indicates onset (new sound)
  const hasSpectralOnset = analysis.spectralFlux > 0.01

  // Decision logic
  // Primary: Must have sufficient energy
  const primaryCriteria = rmsAboveThreshold || sufficientActivity

  // Count how many spectral features suggest speech
  const spectralFeatureCount =
    (zcrInSpeechRange ? 1 : 0) +
    (speechBandDominant ? 1 : 0) +
    (centroidInSpeechRange ? 1 : 0) +
    (lowHighBandRatio > 1.5 ? 1 : 0)

  const secondaryCriteria = spectralFeatureCount >= 2

  // Tertiary: onset detection can help with transient sounds
  const tertiaryCriteria = hasSpectralOnset && analysis.rms > rmsThreshold * 0.5

  return primaryCriteria && (secondaryCriteria || tertiaryCriteria)
}

/**
 * Calculate RMS of audio samples
 *
 * @param samples - Audio samples
 * @returns RMS value (0-1 for normalized audio)
 */
export function calculateRms (samples: Int16Array | Float32Array | Float64Array): number {
  if (samples.length === 0) return 0

  const isInt16 = samples instanceof Int16Array
  let sumSquares = 0

  for (let i = 0; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]
    sumSquares += sample * sample
  }

  return Math.sqrt(sumSquares / samples.length)
}

/**
 * Calculate peak amplitude of audio samples
 *
 * @param samples - Audio samples
 * @returns Peak amplitude (0-1 for normalized audio)
 */
export function calculatePeak (samples: Int16Array | Float32Array | Float64Array): number {
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

  return peak
}

/**
 * Calculate zero-crossing rate
 *
 * @param samples - Audio samples
 * @returns Zero-crossing rate (0-1, typically 0.1-0.3 for speech)
 */
export function calculateZeroCrossingRate (samples: Int16Array | Float32Array | Float64Array): number {
  if (samples.length < 2) return 0

  const isInt16 = samples instanceof Int16Array
  let crossings = 0
  let previousSample = isInt16 ? samples[0] / 32768 : samples[0]

  for (let i = 1; i < samples.length; i++) {
    const sample = isInt16 ? samples[i] / 32768 : samples[i]

    if ((previousSample >= 0 && sample < 0) || (previousSample < 0 && sample >= 0)) {
      crossings++
    }

    previousSample = sample
  }

  return crossings / (samples.length - 1)
}
