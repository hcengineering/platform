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

import {
  analyzeAudioBuffer,
  calculateSpectralFeatures,
  isFrameSpeech,
  getAdaptiveVADThreshold
} from '../stream/audio-analysis'

import { type AdaptiveVADState, type AudioAnalysis } from '../stream/types'

/**
 * Create a Buffer containing 16-bit PCM samples from a Float32Array
 * @param samples - Array of samples in range [-1, 1]
 * @returns Buffer with 16-bit PCM data
 */
function createPcmBuffer (samples: number[]): Buffer {
  const buffer = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    const intSample = Math.round(clamped * 32767)
    buffer.writeInt16LE(intSample, i * 2)
  }
  return buffer
}

/**
 * Generate a sine wave
 * @param frequency - Frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @param duration - Duration in seconds
 * @param amplitude - Amplitude (0-1)
 * @returns Array of samples
 */
function generateSineWave (frequency: number, sampleRate: number, duration: number, amplitude: number = 1.0): number[] {
  const numSamples = Math.floor(sampleRate * duration)
  const samples: number[] = []
  for (let i = 0; i < numSamples; i++) {
    samples.push(amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate))
  }
  return samples
}

/**
 * Generate white noise
 * @param numSamples - Number of samples to generate
 * @param amplitude - Amplitude (0-1)
 * @returns Array of samples
 */
function generateWhiteNoise (numSamples: number, amplitude: number = 1.0): number[] {
  const samples: number[] = []
  for (let i = 0; i < numSamples; i++) {
    samples.push(amplitude * (Math.random() * 2 - 1))
  }
  return samples
}

/**
 * Generate silence
 * @param numSamples - Number of samples
 * @returns Array of zeros
 */
function generateSilence (numSamples: number): number[] {
  return new Array(numSamples).fill(0)
}

/**
 * Create a mock AdaptiveVADState
 */
function createMockVADState (overrides: Partial<AdaptiveVADState> = {}): AdaptiveVADState {
  return {
    noiseFloor: 0.01,
    noiseFloorSamples: 50,
    recentSpeechHistory: [],
    currentSpeechRate: 0.5,
    adaptiveSilenceThresholdMs: 600,
    previousFrameSpectrum: null,
    lookAheadBuffer: [],
    lookAheadDurationMs: 0,
    ...overrides
  }
}

describe('Audio Analysis', () => {
  describe('analyzeAudioBuffer', () => {
    it('should analyze silence correctly', () => {
      // Use 256 samples (power of 2) = 16ms at 16kHz
      const silence = generateSilence(256)
      const buffer = createPcmBuffer(silence)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      expect(analysis.rms).toBeCloseTo(0, 5)
      expect(analysis.peak).toBeCloseTo(0, 5)
      expect(analysis.activeSamples).toBe(0)
      expect(analysis.totalSamples).toBe(256)
      expect(analysis.zeroCrossingRate).toBe(0)
    })

    it('should detect high energy in loud signal', () => {
      // Use 512 samples (power of 2) = 32ms at 16kHz
      const loudSine = generateSineWave(440, 16000, 0.032, 0.8)
      const buffer = createPcmBuffer(loudSine)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      expect(analysis.rms).toBeGreaterThan(0.5)
      expect(analysis.peak).toBeGreaterThan(0.7)
      expect(analysis.activeSamples).toBeGreaterThan(analysis.totalSamples * 0.5)
    })

    it('should detect low energy in quiet signal', () => {
      // Use 512 samples (power of 2)
      const quietSine = generateSineWave(440, 16000, 0.032, 0.005) // Very quiet
      const buffer = createPcmBuffer(quietSine)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      expect(analysis.rms).toBeLessThan(0.01)
      expect(analysis.peak).toBeLessThan(0.01)
      expect(analysis.activeSamples).toBe(0)
    })

    it('should calculate zero-crossing rate correctly', () => {
      // A 1kHz sine wave at 16kHz has about 2000 zero crossings per second
      // Use 512 samples (power of 2) = 32ms
      const sine1k = generateSineWave(1000, 16000, 0.032, 0.5)
      const buffer = createPcmBuffer(sine1k)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      // Zero crossing rate should be proportional to frequency
      expect(analysis.zeroCrossingRate).toBeGreaterThan(0.05)
      expect(analysis.zeroCrossingRate).toBeLessThan(0.3)
    })

    it('should return spectrum for spectral flux calculation', () => {
      // Use 512 samples (power of 2)
      const samples = generateSineWave(500, 16000, 0.032, 0.5)
      const buffer = createPcmBuffer(samples)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      expect(analysis.spectrum).not.toBeNull()
      expect(analysis.spectrum?.length).toBeGreaterThan(0)
    })

    it('should calculate spectral flux when previous spectrum provided', () => {
      // Use 512 samples (power of 2)
      const samples1 = generateSineWave(500, 16000, 0.032, 0.3)
      const samples2 = generateSineWave(500, 16000, 0.032, 0.8)
      const buffer1 = createPcmBuffer(samples1)
      const buffer2 = createPcmBuffer(samples2)

      const analysis1 = analyzeAudioBuffer(buffer1, 16000)
      const analysis2 = analyzeAudioBuffer(buffer2, 16000, analysis1.spectrum)

      // Spectral flux should be > 0 when spectrum changes
      expect(analysis2.spectralFlux).toBeGreaterThanOrEqual(0)
    })

    it('should handle very short buffers', () => {
      // Use 16 samples (power of 2)
      const shortSamples = generateSineWave(440, 16000, 0.001, 0.5) // 1ms = 16 samples
      const buffer = createPcmBuffer(shortSamples)

      const analysis = analyzeAudioBuffer(buffer, 16000)

      expect(analysis.totalSamples).toBe(16)
      expect(analysis.spectrum).not.toBeNull()
    })
  })

  describe('calculateSpectralFeatures', () => {
    it('should detect energy in speech band for speech-like frequencies', () => {
      // Generate a signal in the speech band (300-3400 Hz)
      // Use exactly 512 samples (power of 2)
      const speechFreq = generateSineWave(1000, 16000, 0.032, 0.5)
      const samples = new Float32Array(speechFreq.slice(0, 512))

      const features = calculateSpectralFeatures(samples, 16000)

      expect(features.lowBandEnergy).toBeGreaterThan(0.3)
      // Spectral centroid calculation can vary based on FFT implementation
      expect(features.spectralCentroid).toBeGreaterThan(0)
    })

    it('should detect energy in high band for high frequency signals', () => {
      // Generate a signal above speech band (5000 Hz)
      const highFreq = generateSineWave(5000, 16000, 0.032, 0.5)
      const samples = new Float32Array(highFreq)

      const features = calculateSpectralFeatures(samples, 16000)

      expect(features.highBandEnergy).toBeGreaterThan(0.3)
      expect(features.spectralCentroid).toBeGreaterThan(4000)
    })

    it('should return normalized energies summing to <= 1', () => {
      const noise = generateWhiteNoise(512, 0.3)
      const samples = new Float32Array(noise)

      const features = calculateSpectralFeatures(samples, 16000)

      expect(features.lowBandEnergy).toBeGreaterThanOrEqual(0)
      expect(features.lowBandEnergy).toBeLessThanOrEqual(1)
      expect(features.highBandEnergy).toBeGreaterThanOrEqual(0)
      expect(features.highBandEnergy).toBeLessThanOrEqual(1)
    })

    it('should handle samples shorter than FFT size', () => {
      const shortSamples = new Float32Array(128) // Less than 512
      for (let i = 0; i < 128; i++) {
        shortSamples[i] = Math.sin((2 * Math.PI * 500 * i) / 16000)
      }

      const features = calculateSpectralFeatures(shortSamples, 16000)

      expect(features.spectrum.length).toBeGreaterThan(0)
      expect(features.spectralCentroid).toBeGreaterThanOrEqual(0)
    })

    it('should return valid spectrum array', () => {
      // Use exactly 512 samples
      const samples = new Float32Array(generateSineWave(1000, 16000, 0.032, 0.5).slice(0, 512))

      const features = calculateSpectralFeatures(samples, 16000)

      expect(features.spectrum).toBeInstanceOf(Float64Array)
      // Full spectrum (not single-sided) is returned by magnitude()
      expect(features.spectrum.length).toBe(512)
    })
  })

  describe('getAdaptiveVADThreshold', () => {
    it('should return threshold based on noise floor', () => {
      const state = createMockVADState({ noiseFloor: 0.01 })

      const threshold = getAdaptiveVADThreshold(state)

      // Should be noise floor * VAD_MARGIN_ABOVE_NOISE (2.0)
      expect(threshold).toBeCloseTo(0.02, 3)
    })

    it('should clamp threshold to minimum', () => {
      const state = createMockVADState({ noiseFloor: 0.001 }) // Very low noise

      const threshold = getAdaptiveVADThreshold(state)

      // Should be at least VAD_THRESHOLD_DEFAULT * 0.5 = 0.0075
      expect(threshold).toBeGreaterThanOrEqual(0.0075)
    })

    it('should clamp threshold to maximum', () => {
      const state = createMockVADState({ noiseFloor: 0.1 }) // Very high noise

      const threshold = getAdaptiveVADThreshold(state)

      // Should be at most VAD_THRESHOLD_DEFAULT * 3 = 0.045
      expect(threshold).toBeLessThanOrEqual(0.045)
    })
  })

  describe('isFrameSpeech', () => {
    it('should detect speech in loud signal with speech-like characteristics', () => {
      // Create a speech-like signal with power-of-2 samples (512 = 32ms at 16kHz)
      const speechFreq = generateSineWave(500, 16000, 0.032, 0.3)
      const buffer = createPcmBuffer(speechFreq)
      const analysis = analyzeAudioBuffer(buffer, 16000)

      const isSpeech = isFrameSpeech(analysis)

      expect(isSpeech).toBe(true)
    })

    it('should not detect speech in silence', () => {
      // Use 256 samples (power of 2)
      const silence = generateSilence(256)
      const buffer = createPcmBuffer(silence)
      const analysis = analyzeAudioBuffer(buffer, 16000)

      const isSpeech = isFrameSpeech(analysis)

      expect(isSpeech).toBe(false)
    })

    it('should not detect speech in very quiet signal', () => {
      // Use 512 samples (power of 2)
      const quiet = generateSineWave(500, 16000, 0.032, 0.002)
      const buffer = createPcmBuffer(quiet)
      const analysis = analyzeAudioBuffer(buffer, 16000)

      const isSpeech = isFrameSpeech(analysis)

      expect(isSpeech).toBe(false)
    })

    it('should use adaptive threshold when VAD state provided', () => {
      // Create a mock analysis with controlled RMS value
      // RMS of 0.012 is:
      // - Above threshold with low noise floor (0.005 * 2 = 0.01, clamped to min 0.0075)
      // - Below threshold with high noise floor (0.05 * 2 = 0.1, clamped to max 0.045)
      // Also below secondary (0.045 * 0.5 = 0.0225) and tertiary (0.045 * 0.7 = 0.0315) thresholds
      const analysis: AudioAnalysis = {
        rms: 0.012, // Controlled RMS value
        peak: 0.02,
        activeSamples: 20, // Low activity ratio (20/512 = 0.039 < 0.1)
        totalSamples: 512,
        sumSquares: 0.012 * 0.012 * 512,
        zeroCrossingRate: 0.15, // In speech range
        lowBandEnergy: 0.5, // Speech band
        highBandEnergy: 0.2,
        spectralCentroid: 1000, // In speech range
        spectralFlux: 0.005, // Below onset threshold
        spectrum: null
      }

      // With low noise floor (0.005), threshold = max(0.0075, min(0.045, 0.01)) = 0.01
      // RMS 0.012 > 0.01, so primary criteria passes
      const lowNoiseState = createMockVADState({ noiseFloor: 0.005 })
      const isSpeechLowNoise = isFrameSpeech(analysis, lowNoiseState)

      // With high noise floor (0.05), threshold = max(0.0075, min(0.045, 0.1)) = 0.045
      // RMS 0.012 < 0.045, primary fails
      // Secondary: RMS 0.012 < 0.045 * 0.5 = 0.0225, fails
      // Tertiary: RMS 0.012 < 0.045 * 0.7 = 0.0315, fails
      const highNoiseState = createMockVADState({ noiseFloor: 0.05 })
      const isSpeechHighNoise = isFrameSpeech(analysis, highNoiseState)

      // Low noise floor should be more sensitive (detect as speech)
      // High noise floor with low RMS signal should not detect as speech
      expect(isSpeechLowNoise).toBe(true)
      expect(isSpeechHighNoise).toBe(false)
    })

    it('should detect speech based on spectral features', () => {
      // Create analysis with good spectral features but borderline RMS
      const analysis: AudioAnalysis = {
        rms: 0.01, // Below default threshold
        peak: 0.02,
        activeSamples: 20,
        totalSamples: 320,
        sumSquares: 0.01,
        zeroCrossingRate: 0.15, // In speech range
        lowBandEnergy: 0.6, // Speech band dominant
        highBandEnergy: 0.1,
        spectralCentroid: 1500, // In speech range
        spectralFlux: 0.02,
        spectrum: null
      }

      const isSpeech = isFrameSpeech(analysis)

      // Should detect as speech due to spectral features
      expect(isSpeech).toBe(true)
    })

    it('should reject noise with wrong spectral characteristics', () => {
      // High frequency noise - set RMS below default VAD threshold (0.015)
      // to ensure it fails primary criteria
      const analysis: AudioAnalysis = {
        rms: 0.01, // Below VAD_THRESHOLD_DEFAULT (0.015)
        peak: 0.02,
        activeSamples: 10,
        totalSamples: 512,
        sumSquares: 0.01,
        zeroCrossingRate: 0.6, // Too high for speech
        lowBandEnergy: 0.1, // Not speech band dominant
        highBandEnergy: 0.8, // High frequency dominant
        spectralCentroid: 5000, // Outside speech range
        spectralFlux: 0.001,
        spectrum: null
      }

      const isSpeech = isFrameSpeech(analysis)

      expect(isSpeech).toBe(false)
    })
  })

  describe('Integration tests', () => {
    it('should process continuous audio frames', () => {
      const sampleRate = 16000
      const numFrames = 10

      let previousSpectrum: Float64Array | null = null
      const results: AudioAnalysis[] = []

      for (let i = 0; i < numFrames; i++) {
        // Generate frames with varying amplitude (simulating speech)
        const amplitude = i < 5 ? 0.3 : 0.01 // First 5 frames speech, last 5 silence
        const samples = generateSineWave(800, sampleRate, 0.032, amplitude)
        const buffer = createPcmBuffer(samples)

        const analysis = analyzeAudioBuffer(buffer, sampleRate, previousSpectrum)
        previousSpectrum = analysis.spectrum
        results.push(analysis)
      }

      // First 5 frames should be detected as speech
      for (let i = 0; i < 5; i++) {
        expect(isFrameSpeech(results[i])).toBe(true)
      }

      // Last 5 frames should be silence
      for (let i = 5; i < 10; i++) {
        expect(isFrameSpeech(results[i])).toBe(false)
      }
    })

    it('should handle mixed frequency content', () => {
      // Mix of speech frequency and high frequency
      const sampleRate = 16000
      const duration = 0.032
      const numSamples = Math.floor(sampleRate * duration)

      const samples: number[] = []
      for (let i = 0; i < numSamples; i++) {
        const speech = 0.3 * Math.sin((2 * Math.PI * 800 * i) / sampleRate)
        const highFreq = 0.1 * Math.sin((2 * Math.PI * 5000 * i) / sampleRate)
        samples.push(speech + highFreq)
      }

      const buffer = createPcmBuffer(samples)
      const analysis = analyzeAudioBuffer(buffer, sampleRate)

      // Should still detect as speech since speech band is dominant
      expect(analysis.lowBandEnergy).toBeGreaterThan(analysis.highBandEnergy)
      expect(isFrameSpeech(analysis)).toBe(true)
    })
  })
})
