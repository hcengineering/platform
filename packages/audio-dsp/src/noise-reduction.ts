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
 * Noise reduction using Spectral Subtraction algorithm
 *
 * This module implements noise reduction for audio signals using the spectral
 * subtraction method. It estimates the noise spectrum from initial silent frames
 * and subtracts it from subsequent frames to reduce background noise.
 *
 * Algorithm:
 * 1. Estimate noise spectrum from initial frames (assumed to be silence/noise)
 * 2. For each frame:
 *    - Apply windowing and compute FFT
 *    - Subtract estimated noise spectrum (with over-subtraction factor)
 *    - Apply spectral floor to prevent negative values
 *    - Compute IFFT and overlap-add
 *
 * Features:
 * - Over-subtraction factor to control noise reduction strength
 * - Spectral floor to prevent musical noise artifacts
 * - Adaptive noise estimation
 * - Overlap-add synthesis for smooth output
 */

import { fftInPlace, createHannWindow, isPowerOf2, nextPowerOf2 } from './fft'
import { parseWavHeader, createWavFile, WAV_HEADER_SIZE } from './wav'

/**
 * Configuration for noise reduction
 */
export interface NoiseReductionConfig {
  /** FFT frame size (must be power of 2, default: 512) */
  frameSize: number
  /** Hop size between frames (default: frameSize / 2 for 50% overlap) */
  hopSize: number
  /** Number of initial frames to use for noise estimation (default: 20) */
  noiseEstimationFrames: number
  /**
   * Over-subtraction factor (default: 2.0)
   * Higher values = more aggressive noise removal, but may introduce artifacts
   * Typical range: 1.0 - 4.0
   */
  overSubtractionFactor: number
  /**
   * Spectral floor (default: 0.02)
   * Minimum magnitude relative to original, prevents "musical noise" artifacts
   * Typical range: 0.01 - 0.1
   */
  spectralFloor: number
  /**
   * Smoothing factor for noise estimate update (default: 0.98)
   * Higher values = slower adaptation, more stable
   */
  smoothingFactor: number
  /**
   * Whether to use adaptive noise estimation (default: false)
   * If true, noise estimate is updated during silence periods
   */
  adaptiveNoiseEstimation: boolean
  /**
   * RMS threshold for silence detection in adaptive mode (default: 0.02)
   */
  silenceThreshold: number
}

/**
 * Result of noise reduction processing
 */
export interface NoiseReductionResult {
  /** Processed audio samples */
  samples: Float32Array
  /** Sample rate (unchanged from input) */
  sampleRate: number
  /** Estimated noise spectrum (magnitude) */
  noiseSpectrum: Float64Array
  /** Number of frames processed */
  framesProcessed: number
  /** Reduction statistics */
  stats: {
    /** Average noise reduction in dB */
    averageReductionDb: number
    /** Peak noise reduction in dB */
    peakReductionDb: number
    /** Number of frames used for noise estimation */
    noiseFramesUsed: number
  }
}

/**
 * Default noise reduction configuration
 */
export const DEFAULT_NOISE_REDUCTION_CONFIG: NoiseReductionConfig = {
  frameSize: 512,
  hopSize: 256,
  noiseEstimationFrames: 20,
  overSubtractionFactor: 2.0,
  spectralFloor: 0.02,
  smoothingFactor: 0.98,
  adaptiveNoiseEstimation: false,
  silenceThreshold: 0.02
}

/**
 * Noise reduction processor using spectral subtraction
 */
export class NoiseReducer {
  private readonly config: NoiseReductionConfig
  private readonly window: Float64Array
  private noiseSpectrum: Float64Array | null = null
  private noiseFrameCount: number = 0

  constructor (config: Partial<NoiseReductionConfig> = {}) {
    this.config = { ...DEFAULT_NOISE_REDUCTION_CONFIG, ...config }

    // Validate frame size
    if (!isPowerOf2(this.config.frameSize)) {
      this.config.frameSize = nextPowerOf2(this.config.frameSize)
    }

    // Default hop size to 50% overlap
    if (config.hopSize === undefined) {
      this.config.hopSize = this.config.frameSize / 2
    }

    // Create Hann window
    this.window = createHannWindow(this.config.frameSize)
  }

  /**
   * Process audio samples with noise reduction
   *
   * @param samples - Input audio samples (normalized -1 to 1)
   * @param sampleRate - Sample rate in Hz
   * @returns Noise reduction result
   */
  process (samples: Float32Array | Float64Array, sampleRate: number): NoiseReductionResult {
    const { frameSize, hopSize, noiseEstimationFrames, overSubtractionFactor, spectralFloor } = this.config

    // Convert to Float64Array for processing
    const input = samples instanceof Float64Array ? samples : new Float64Array(samples)

    // Calculate number of frames
    const numFrames = Math.floor((input.length - frameSize) / hopSize) + 1

    if (numFrames < noiseEstimationFrames + 1) {
      // Not enough frames, return original
      return {
        samples: new Float32Array(samples),
        sampleRate,
        noiseSpectrum: new Float64Array(frameSize / 2),
        framesProcessed: 0,
        stats: {
          averageReductionDb: 0,
          peakReductionDb: 0,
          noiseFramesUsed: 0
        }
      }
    }

    // Initialize noise spectrum
    this.noiseSpectrum = new Float64Array(frameSize / 2)
    this.noiseFrameCount = 0

    // Estimate noise from initial frames
    this.estimateNoiseSpectrum(input, noiseEstimationFrames)

    // Process all frames
    const outputLength = input.length
    const output = new Float64Array(outputLength)
    const windowSum = new Float64Array(outputLength)

    let totalReduction = 0
    let peakReduction = 0
    let framesProcessed = 0

    for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
      const start = frameIndex * hopSize

      // Extract and window the frame
      const frame = this.extractFrame(input, start)

      // Compute FFT
      const real = new Float64Array(frame)
      const imag = new Float64Array(frameSize)
      fftInPlace(real, imag, false)

      // Compute magnitude and phase
      const magnitude = new Float64Array(frameSize / 2)
      const phase = new Float64Array(frameSize / 2)

      for (let k = 0; k < frameSize / 2; k++) {
        magnitude[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k])
        phase[k] = Math.atan2(imag[k], real[k])
      }

      // Spectral subtraction
      const cleanMagnitude = new Float64Array(frameSize / 2)
      let frameReduction = 0

      for (let k = 0; k < frameSize / 2; k++) {
        // Subtract noise with over-subtraction
        const subtracted = magnitude[k] - overSubtractionFactor * this.noiseSpectrum[k]

        // Apply spectral floor
        const floor = spectralFloor * magnitude[k]
        cleanMagnitude[k] = Math.max(subtracted, floor)

        // Track reduction
        if (magnitude[k] > 1e-10) {
          const reductionDb = 20 * Math.log10(cleanMagnitude[k] / magnitude[k])
          frameReduction += reductionDb
          if (reductionDb < peakReduction) {
            peakReduction = reductionDb
          }
        }
      }

      totalReduction += frameReduction / (frameSize / 2)

      // Adaptive noise estimation during silence
      if (this.config.adaptiveNoiseEstimation) {
        const frameRms = this.calculateFrameRms(frame)
        if (frameRms < this.config.silenceThreshold) {
          this.updateNoiseSpectrum(magnitude)
        }
      }

      // Reconstruct complex spectrum (mirror for full FFT)
      const cleanReal = new Float64Array(frameSize)
      const cleanImag = new Float64Array(frameSize)

      for (let k = 0; k < frameSize / 2; k++) {
        cleanReal[k] = cleanMagnitude[k] * Math.cos(phase[k])
        cleanImag[k] = cleanMagnitude[k] * Math.sin(phase[k])
      }

      // Mirror for negative frequencies
      for (let k = 1; k < frameSize / 2; k++) {
        cleanReal[frameSize - k] = cleanReal[k]
        cleanImag[frameSize - k] = -cleanImag[k]
      }

      // Inverse FFT
      fftInPlace(cleanReal, cleanImag, true)

      // Overlap-add with window
      for (let i = 0; i < frameSize; i++) {
        const outputIndex = start + i
        if (outputIndex < outputLength) {
          output[outputIndex] += cleanReal[i] * this.window[i]
          windowSum[outputIndex] += this.window[i] * this.window[i]
        }
      }

      framesProcessed++
    }

    // Normalize by window sum
    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) {
        output[i] /= windowSum[i]
      } else {
        output[i] = input[i]
      }
    }

    // Convert to Float32Array
    const outputFloat32 = new Float32Array(outputLength)
    for (let i = 0; i < outputLength; i++) {
      // Clamp to valid range
      outputFloat32[i] = Math.max(-1, Math.min(1, output[i]))
    }

    return {
      samples: outputFloat32,
      sampleRate,
      noiseSpectrum: this.noiseSpectrum,
      framesProcessed,
      stats: {
        averageReductionDb: framesProcessed > 0 ? totalReduction / framesProcessed : 0,
        peakReductionDb: peakReduction,
        noiseFramesUsed: this.noiseFrameCount
      }
    }
  }

  /**
   * Estimate noise spectrum from initial frames
   */
  private estimateNoiseSpectrum (samples: Float64Array, numFrames: number): void {
    const { frameSize, hopSize } = this.config

    for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
      const start = frameIndex * hopSize

      if (start + frameSize > samples.length) break

      // Extract and window the frame
      const frame = this.extractFrame(samples, start)

      // Compute FFT
      const real = new Float64Array(frame)
      const imag = new Float64Array(frameSize)
      fftInPlace(real, imag, false)

      // Accumulate magnitude spectrum
      for (let k = 0; k < frameSize / 2; k++) {
        const magnitude = Math.sqrt(real[k] * real[k] + imag[k] * imag[k])
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.noiseSpectrum![k] += magnitude
      }

      this.noiseFrameCount++
    }

    // Average the noise spectrum
    if (this.noiseFrameCount > 0) {
      for (let k = 0; k < frameSize / 2; k++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.noiseSpectrum![k] /= this.noiseFrameCount
      }
    }
  }

  /**
   * Update noise spectrum with new frame (for adaptive estimation)
   */
  private updateNoiseSpectrum (magnitude: Float64Array): void {
    const { smoothingFactor } = this.config

    if (this.noiseSpectrum === null) return

    for (let k = 0; k < this.noiseSpectrum.length; k++) {
      this.noiseSpectrum[k] = smoothingFactor * this.noiseSpectrum[k] + (1 - smoothingFactor) * magnitude[k]
    }
  }

  /**
   * Extract a windowed frame from samples
   */
  private extractFrame (samples: Float64Array, start: number): Float64Array {
    const { frameSize } = this.config
    const frame = new Float64Array(frameSize)

    for (let i = 0; i < frameSize; i++) {
      const index = start + i
      if (index < samples.length) {
        frame[i] = samples[index] * this.window[i]
      }
    }

    return frame
  }

  /**
   * Calculate RMS of a frame
   */
  private calculateFrameRms (frame: Float64Array): number {
    let sumSquares = 0
    for (let i = 0; i < frame.length; i++) {
      sumSquares += frame[i] * frame[i]
    }
    return Math.sqrt(sumSquares / frame.length)
  }

  /**
   * Reset the noise estimate
   */
  reset (): void {
    this.noiseSpectrum = null
    this.noiseFrameCount = 0
  }

  /**
   * Get current noise spectrum (if estimated)
   */
  getNoiseSpectrum (): Float64Array | null {
    return this.noiseSpectrum
  }

  /**
   * Set noise spectrum manually (e.g., from a previous recording)
   */
  setNoiseSpectrum (spectrum: Float64Array): void {
    this.noiseSpectrum = new Float64Array(spectrum)
    this.noiseFrameCount = 1
  }
}

/**
 * Apply noise reduction to WAV file data
 *
 * @param wavData - WAV file data (with header)
 * @param config - Noise reduction configuration
 * @returns Processed WAV file data
 */
export function reduceNoiseFromWav (
  wavData: Uint8Array | Buffer,
  config: Partial<NoiseReductionConfig> = {}
): Uint8Array {
  // Parse WAV header
  const header = parseWavHeader(wavData)

  if (header === undefined) {
    throw new Error('Invalid WAV file')
  }

  if (header.bitsPerSample !== 16) {
    throw new Error('Only 16-bit WAV files are supported')
  }

  // Extract samples
  const audioData = wavData.subarray(WAV_HEADER_SIZE)
  const sampleCount = Math.floor(audioData.length / 2)
  const samples = new Float32Array(sampleCount)

  // Convert 16-bit PCM to float
  const audioDataArray = audioData instanceof Uint8Array ? audioData : new Uint8Array(audioData)
  const view = new DataView(
    audioDataArray.buffer.slice(audioDataArray.byteOffset, audioDataArray.byteOffset + audioDataArray.byteLength)
  )

  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768
  }

  // Process with noise reduction
  const reducer = new NoiseReducer(config)
  const result = reducer.process(samples, header.sampleRate)

  // Convert back to Int16Array
  const outputSamples = new Int16Array(result.samples.length)
  for (let i = 0; i < result.samples.length; i++) {
    outputSamples[i] = Math.round(result.samples[i] * 32767)
  }

  // Create WAV file
  return createWavFile(outputSamples, header.sampleRate, header.channels)
}

/**
 * Apply noise reduction to Float32Array samples
 *
 * @param samples - Audio samples (normalized -1 to 1)
 * @param sampleRate - Sample rate in Hz
 * @param config - Noise reduction configuration
 * @returns Processed samples
 */
export function reduceNoise (
  samples: Float32Array,
  sampleRate: number,
  config: Partial<NoiseReductionConfig> = {}
): Float32Array {
  const reducer = new NoiseReducer(config)
  const result = reducer.process(samples, sampleRate)
  return result.samples
}

/**
 * Estimate noise spectrum from a sample of audio
 * Useful for pre-computing noise profile from a known noise-only segment
 *
 * @param samples - Audio samples (should be noise-only)
 * @param sampleRate - Sample rate in Hz
 * @param frameSize - FFT frame size (default: 512)
 * @returns Estimated noise spectrum
 */
export function estimateNoiseSpectrum (
  samples: Float32Array | Float64Array,
  sampleRate: number,
  frameSize: number = 512
): Float64Array {
  const input = samples instanceof Float64Array ? samples : new Float64Array(samples)
  const hopSize = frameSize / 2
  const window = createHannWindow(frameSize)
  const spectrum = new Float64Array(frameSize / 2)
  let frameCount = 0

  for (let start = 0; start + frameSize <= input.length; start += hopSize) {
    // Extract and window frame
    const frame = new Float64Array(frameSize)
    for (let i = 0; i < frameSize; i++) {
      frame[i] = input[start + i] * window[i]
    }

    // Compute FFT
    const real = new Float64Array(frame)
    const imag = new Float64Array(frameSize)
    fftInPlace(real, imag, false)

    // Accumulate magnitude
    for (let k = 0; k < frameSize / 2; k++) {
      spectrum[k] += Math.sqrt(real[k] * real[k] + imag[k] * imag[k])
    }

    frameCount++
  }

  // Average
  if (frameCount > 0) {
    for (let k = 0; k < frameSize / 2; k++) {
      spectrum[k] /= frameCount
    }
  }

  return spectrum
}
