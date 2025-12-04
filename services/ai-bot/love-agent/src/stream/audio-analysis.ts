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

/**
 * Audio analysis functions for VAD (Voice Activity Detection)
 * Provides spectral analysis, RMS calculation, and speech detection
 */

import {
  stft,
  magnitude,
  createHannWindow
} from '@hcengineering/audio-dsp'

import {
  type AudioAnalysis,
  type SpectralAnalysisResult,
  VAD_FRAME_THRESHOLD,
  SPEECH_BAND_LOW,
  SPEECH_BAND_HIGH,
  HIGH_BAND_LOW,
  HIGH_BAND_HIGH,
  VAD_THRESHOLD_DEFAULT,
  SPEECH_RATIO_THRESHOLD,
  SPEECH_CENTROID_MIN,
  SPEECH_CENTROID_MAX,
  type AdaptiveVADState
} from './types.js'

/**
 * Calculate spectral features: band energies, spectral centroid
 * Uses FFT for speech-relevant frequency bands
 *
 * @param samples - Float32Array of normalized audio samples
 * @param sampleRate - Sample rate in Hz
 * @returns Spectral analysis results
 */
/**
 * Find the nearest power of 2 that is less than or equal to n
 */
function nearestPowerOf2 (n: number): number {
  if (n <= 0) return 1
  let power = 1
  while (power * 2 <= n) {
    power *= 2
  }
  return power
}

export function calculateSpectralFeatures (
  samples: Float32Array,
  sampleRate: number
): SpectralAnalysisResult {
  // Use audio-dsp library for FFT-based spectral analysis
  // FFT size must be a power of 2
  const targetSize = Math.min(512, samples.length)
  const fftSize = nearestPowerOf2(targetSize)

  // Pad samples to fftSize if needed
  let paddedSamples = samples
  if (samples.length < fftSize) {
    paddedSamples = new Float32Array(fftSize)
    paddedSamples.set(samples)
  }

  // Use STFT from audio-dsp with a single frame
  const window = createHannWindow(fftSize)
  const frames = stft(paddedSamples.slice(0, fftSize), fftSize, fftSize, window)

  // Get magnitude spectrum from first frame (full spectrum, not single-sided)
  const spectrum = frames.length > 0 ? magnitude(frames[0].real, frames[0].imag) : new Float64Array(fftSize)

  // Calculate bin boundaries for frequency bands
  const binWidth = sampleRate / fftSize
  const speechLowBin = Math.floor(SPEECH_BAND_LOW / binWidth)
  const speechHighBin = Math.min(Math.ceil(SPEECH_BAND_HIGH / binWidth), fftSize / 2 - 1)
  const highLowBin = Math.floor(HIGH_BAND_LOW / binWidth)
  const highHighBin = Math.min(Math.ceil(HIGH_BAND_HIGH / binWidth), fftSize / 2 - 1)

  let totalEnergy = 0
  let speechBandEnergy = 0
  let highBandEnergy = 0
  let weightedFrequencySum = 0
  let totalMagnitude = 0

  for (let k = 0; k < spectrum.length; k++) {
    const frequency = k * binWidth
    const mag = spectrum[k]
    const magnitudeSquared = mag * mag

    totalEnergy += magnitudeSquared
    totalMagnitude += mag
    weightedFrequencySum += frequency * mag

    // Accumulate band energies
    if (k >= speechLowBin && k <= speechHighBin) {
      speechBandEnergy += magnitudeSquared
    }
    if (k >= highLowBin && k <= highHighBin) {
      highBandEnergy += magnitudeSquared
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
 * Calculate RMS and detect voice activity for a buffer of 16-bit PCM samples
 * Enhanced with zero-crossing rate, band energy, spectral centroid, and spectral flux
 *
 * @param buf - Buffer containing 16-bit PCM audio data
 * @param sampleRate - Sample rate in Hz (default: 16000)
 * @param previousSpectrum - Previous frame's spectrum for flux calculation
 * @returns Audio analysis results
 */
export function analyzeAudioBuffer (
  buf: Buffer,
  sampleRate: number = 16000,
  previousSpectrum: Float64Array | null = null
): AudioAnalysis {
  const numSamples = buf.length / 2 // 16-bit samples

  // Extract samples to Float32Array and compute metrics in single pass
  const sampleArray = new Float32Array(numSamples)
  let activeSamples = 0
  let sumSquares = 0
  let peak = 0
  let zeroCrossings = 0
  let previousSample = 0

  for (let i = 0; i < buf.length; i += 2) {
    const sample = buf.readInt16LE(i)
    const normalized = sample / 32768 // Normalize to -1 to 1
    const absNormalized = Math.abs(normalized)
    sampleArray[i / 2] = normalized

    // Accumulate for RMS
    sumSquares += normalized * normalized

    // Track peak
    if (absNormalized > peak) {
      peak = absNormalized
    }

    // Count active samples
    if (absNormalized > VAD_FRAME_THRESHOLD) {
      activeSamples++
    }

    // Zero-crossing detection
    if (i > 0 && ((previousSample >= 0 && normalized < 0) || (previousSample < 0 && normalized >= 0))) {
      zeroCrossings++
    }
    previousSample = normalized
  }

  const rms = Math.sqrt(sumSquares / numSamples)
  const zeroCrossingRate = zeroCrossings / numSamples

  // Calculate band energies and spectral features using FFT
  const spectralAnalysis = calculateSpectralFeatures(sampleArray, sampleRate)

  // Calculate spectral flux (change from previous frame)
  let spectralFlux = 0
  if (previousSpectrum !== null && spectralAnalysis.spectrum.length === previousSpectrum.length) {
    for (let i = 0; i < spectralAnalysis.spectrum.length; i++) {
      const diff = spectralAnalysis.spectrum[i] - previousSpectrum[i]
      if (diff > 0) {
        spectralFlux += diff // Only positive changes (onset detection)
      }
    }
    spectralFlux /= spectralAnalysis.spectrum.length
  }

  return {
    rms,
    peak,
    activeSamples,
    totalSamples: numSamples,
    sumSquares,
    zeroCrossingRate,
    lowBandEnergy: spectralAnalysis.lowBandEnergy,
    highBandEnergy: spectralAnalysis.highBandEnergy,
    spectralCentroid: spectralAnalysis.spectralCentroid,
    spectralFlux,
    spectrum: spectralAnalysis.spectrum
  }
}

/**
 * Get adaptive VAD threshold based on current noise floor
 *
 * @param state - Adaptive VAD state
 * @returns Calculated VAD threshold
 */
export function getAdaptiveVADThreshold (state: AdaptiveVADState): number {
  const VAD_MARGIN_ABOVE_NOISE = 2.0
  const adaptiveThreshold = state.noiseFloor * VAD_MARGIN_ABOVE_NOISE
  // Ensure threshold is within reasonable bounds
  return Math.max(VAD_THRESHOLD_DEFAULT * 0.5, Math.min(VAD_THRESHOLD_DEFAULT * 3, adaptiveThreshold))
}

/**
 * Detect if current frame contains speech based on analysis
 * Uses adaptive thresholds and multi-criteria detection
 *
 * @param analysis - Audio analysis results
 * @param adaptiveVAD - Optional adaptive VAD state for threshold adjustment
 * @returns True if frame likely contains speech
 */
export function isFrameSpeech (analysis: AudioAnalysis, adaptiveVAD?: AdaptiveVADState): boolean {
  const speechRatio = analysis.totalSamples > 0 ? analysis.activeSamples / analysis.totalSamples : 0

  // Get adaptive threshold or use default
  const vadThreshold = adaptiveVAD !== undefined ? getAdaptiveVADThreshold(adaptiveVAD) : VAD_THRESHOLD_DEFAULT

  // Multi-criteria speech detection:

  // 1. RMS energy above adaptive threshold (primary)
  const rmsAboveThreshold = analysis.rms > vadThreshold

  // 2. Sufficient active samples (speech ratio)
  const sufficientActivity = speechRatio > SPEECH_RATIO_THRESHOLD

  // 3. Zero-crossing rate in speech range (0.05-0.5 typical for speech)
  const zcrInSpeechRange = analysis.zeroCrossingRate > 0.05 && analysis.zeroCrossingRate < 0.5

  // 4. Energy concentrated in speech band (300-3400 Hz)
  const speechBandDominant = analysis.lowBandEnergy > 0.3

  // 5. Spectral centroid in speech range (indicates voice vs noise)
  const centroidInSpeechRange =
    analysis.spectralCentroid >= SPEECH_CENTROID_MIN && analysis.spectralCentroid <= SPEECH_CENTROID_MAX

  // 6. High frequency energy check (speech has less high freq than noise)
  const lowHighBandRatio = analysis.lowBandEnergy > analysis.highBandEnergy * 1.5

  // 7. Spectral flux indicates onset (helps detect speech start)
  const hasSpectralOnset = analysis.spectralFlux > 0.01

  // Combined decision using weighted criteria:
  // - Primary: RMS or activity ratio (fast response)
  // - Secondary: spectral characteristics (better accuracy)
  // - Tertiary: onset detection (speech start)

  const primaryCriteria = rmsAboveThreshold || sufficientActivity

  // Secondary requires multiple spectral features to agree
  const spectralFeatureCount =
    (zcrInSpeechRange ? 1 : 0) +
    (speechBandDominant ? 1 : 0) +
    (centroidInSpeechRange ? 1 : 0) +
    (lowHighBandRatio ? 1 : 0)

  const secondaryCriteria = spectralFeatureCount >= 3 && analysis.rms > vadThreshold * 0.5

  // Tertiary: onset with some energy
  const tertiaryCriteria = hasSpectralOnset && analysis.rms > vadThreshold * 0.7 && centroidInSpeechRange

  return primaryCriteria || secondaryCriteria || tertiaryCriteria
}
