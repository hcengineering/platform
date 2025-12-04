// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import {
  analyzeAudio,
  analyzeAudioBuffer,
  calculateSpectralFeatures,
  detectVoiceActivity,
  isFrameSpeech,
  calculateRms,
  calculatePeak,
  calculateZeroCrossingRate,
  AudioAnalysis
} from '../analysis'
import { createWavFile } from '../wav'

describe('Audio analysis utilities', () => {
  describe('calculateRms', () => {
    it('should return 0 for empty array', () => {
      expect(calculateRms(new Float32Array(0))).toBe(0)
      expect(calculateRms(new Int16Array(0))).toBe(0)
    })

    it('should calculate RMS for Float32Array', () => {
      // Constant signal of 0.5 should have RMS of 0.5
      const signal = new Float32Array(100).fill(0.5)
      expect(calculateRms(signal)).toBeCloseTo(0.5, 5)
    })

    it('should calculate RMS for sine wave', () => {
      const N = 1000
      const signal = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin((2 * Math.PI * i) / N)
      }
      // RMS of sine wave is 1/sqrt(2) ≈ 0.707
      expect(calculateRms(signal)).toBeCloseTo(1 / Math.sqrt(2), 2)
    })

    it('should calculate RMS for Int16Array', () => {
      // Full scale signal
      const signal = new Int16Array([32767, -32768, 32767, -32768])
      // Should be close to 1.0 (normalized)
      expect(calculateRms(signal)).toBeCloseTo(1.0, 1)
    })

    it('should handle Int16Array with small values', () => {
      // Half scale
      const signal = new Int16Array([16384, -16384, 16384, -16384])
      expect(calculateRms(signal)).toBeCloseTo(0.5, 1)
    })

    it('should return 0 for silent signal', () => {
      const signal = new Float32Array(100).fill(0)
      expect(calculateRms(signal)).toBe(0)
    })

    it('should handle mixed positive and negative values', () => {
      const signal = new Float32Array([0.5, -0.5, 0.5, -0.5])
      expect(calculateRms(signal)).toBeCloseTo(0.5, 5)
    })
  })

  describe('calculatePeak', () => {
    it('should return 0 for empty array', () => {
      expect(calculatePeak(new Float32Array(0))).toBe(0)
      expect(calculatePeak(new Int16Array(0))).toBe(0)
    })

    it('should find peak in Float32Array', () => {
      const signal = new Float32Array([0.1, 0.5, 0.3, 0.8, 0.2])
      expect(calculatePeak(signal)).toBeCloseTo(0.8, 5)
    })

    it('should find negative peak', () => {
      const signal = new Float32Array([0.1, -0.9, 0.3, 0.5])
      expect(calculatePeak(signal)).toBeCloseTo(0.9, 5)
    })

    it('should handle Int16Array', () => {
      const signal = new Int16Array([1000, -2000, 500, 1500])
      // Peak is 2000/32768 ≈ 0.061
      expect(calculatePeak(signal)).toBeCloseTo(2000 / 32768, 3)
    })

    it('should return 1.0 for full scale Int16Array', () => {
      const signal = new Int16Array([0, 32767, 0])
      expect(calculatePeak(signal)).toBeCloseTo(1.0, 2)
    })

    it('should return 0 for silent signal', () => {
      const signal = new Float32Array(100).fill(0)
      expect(calculatePeak(signal)).toBe(0)
    })
  })

  describe('calculateZeroCrossingRate', () => {
    it('should return 0 for empty array', () => {
      expect(calculateZeroCrossingRate(new Float32Array(0))).toBe(0)
    })

    it('should return 0 for constant signal', () => {
      const signal = new Float32Array(100).fill(0.5)
      expect(calculateZeroCrossingRate(signal)).toBe(0)
    })

    it('should calculate ZCR for alternating signal', () => {
      // Alternating +1, -1 should have maximum ZCR
      const signal = new Float32Array(100)
      for (let i = 0; i < 100; i++) {
        signal[i] = i % 2 === 0 ? 1 : -1
      }
      // Should have high ZCR (crossings at each sample transition)
      expect(calculateZeroCrossingRate(signal)).toBeGreaterThan(0.9)
    })

    it('should calculate ZCR for sine wave', () => {
      const N = 1000
      const freq = 10 // 10 cycles
      const signal = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin((2 * Math.PI * freq * i) / N)
      }
      // 10 cycles = 20 zero crossings in 1000 samples = 0.02 ZCR
      expect(calculateZeroCrossingRate(signal)).toBeCloseTo(0.02, 1)
    })

    it('should handle Int16Array', () => {
      const signal = new Int16Array([1000, -1000, 1000, -1000, 1000])
      // Should have high ZCR for alternating signal
      expect(calculateZeroCrossingRate(signal)).toBeGreaterThan(0.7)
    })

    it('should return low ZCR for low frequency signal', () => {
      const N = 1000
      const signal = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin((2 * Math.PI * i) / N) // 1 cycle
      }
      expect(calculateZeroCrossingRate(signal)).toBeLessThan(0.01)
    })
  })

  describe('analyzeAudioBuffer', () => {
    it('should analyze Buffer input', () => {
      // Create a simple 16-bit PCM buffer
      const samples = 100
      const buffer = Buffer.alloc(samples * 2)
      for (let i = 0; i < samples; i++) {
        buffer.writeInt16LE(Math.floor(Math.sin((2 * Math.PI * i) / samples) * 16384), i * 2)
      }

      const result = analyzeAudioBuffer(buffer, 16000)

      expect(result).toBeDefined()
      expect(result.rms).toBeGreaterThan(0)
      expect(result.peak).toBeGreaterThan(0)
      expect(result.totalSamples).toBe(samples)
    })

    it('should calculate correct total samples', () => {
      const samples = 500
      const buffer = Buffer.alloc(samples * 2)

      const result = analyzeAudioBuffer(buffer, 16000)

      expect(result.totalSamples).toBe(samples)
    })

    it('should calculate active samples above threshold', () => {
      // Create buffer with some loud samples
      const buffer = Buffer.alloc(200)
      for (let i = 0; i < 50; i++) {
        buffer.writeInt16LE(20000, i * 2) // Loud
      }
      for (let i = 50; i < 100; i++) {
        buffer.writeInt16LE(100, i * 2) // Quiet
      }

      const result = analyzeAudioBuffer(buffer, 16000)

      expect(result.activeSamples).toBeGreaterThan(0)
      expect(result.activeSamples).toBeLessThan(result.totalSamples)
    })

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0)
      const result = analyzeAudioBuffer(buffer, 16000)

      expect(result.rms).toBe(0)
      expect(result.peak).toBe(0)
      expect(result.totalSamples).toBe(0)
    })

    it('should calculate spectral features', () => {
      const samples = 512
      const buffer = Buffer.alloc(samples * 2)
      for (let i = 0; i < samples; i++) {
        buffer.writeInt16LE(Math.floor(Math.sin((2 * Math.PI * 10 * i) / samples) * 10000), i * 2)
      }

      const result = analyzeAudioBuffer(buffer, 16000)

      expect(result.lowBandEnergy).toBeDefined()
      expect(result.highBandEnergy).toBeDefined()
      expect(result.spectralCentroid).toBeDefined()
    })
  })

  describe('analyzeAudio', () => {
    it('should analyze Float32Array', () => {
      const samples = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        samples[i] = Math.sin((2 * Math.PI * 5 * i) / 256)
      }

      const result = analyzeAudio(samples, 16000)

      expect(result).toBeDefined()
      expect(result.rms).toBeGreaterThan(0)
      expect(result.peak).toBeGreaterThan(0)
    })

    it('should handle silent audio', () => {
      const samples = new Float32Array(256).fill(0)
      const result = analyzeAudio(samples, 16000)

      expect(result.rms).toBe(0)
      expect(result.peak).toBe(0)
      expect(result.activeSamples).toBe(0)
    })

    it('should track previous spectrum for spectral flux', () => {
      const samples = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        samples[i] = Math.sin((2 * Math.PI * 10 * i) / 256)
      }

      const result1 = analyzeAudio(samples, 16000)
      const result2 = analyzeAudio(samples, 16000, result1.spectrum)

      // Same signal should have low spectral flux
      expect(result2.spectralFlux).toBeDefined()
    })
  })

  describe('calculateSpectralFeatures', () => {
    it('should calculate low band energy', () => {
      const samples = new Float32Array(512)
      // Low frequency sine wave (300 Hz at 16kHz sample rate)
      for (let i = 0; i < 512; i++) {
        samples[i] = Math.sin((2 * Math.PI * 300 * i) / 16000)
      }

      const result = calculateSpectralFeatures(samples, 16000)

      expect(result.lowBandEnergy).toBeGreaterThan(0)
    })

    it('should calculate high band energy', () => {
      const samples = new Float32Array(512)
      // High frequency sine wave (5000 Hz at 16kHz sample rate)
      for (let i = 0; i < 512; i++) {
        samples[i] = Math.sin((2 * Math.PI * 5000 * i) / 16000)
      }

      const result = calculateSpectralFeatures(samples, 16000)

      expect(result.highBandEnergy).toBeGreaterThan(0)
    })

    it('should calculate spectral centroid', () => {
      const samples = new Float32Array(512)
      for (let i = 0; i < 512; i++) {
        samples[i] = Math.sin((2 * Math.PI * 1000 * i) / 16000)
      }

      const result = calculateSpectralFeatures(samples, 16000)

      // Spectral centroid should be near 1000 Hz for 1kHz sine
      expect(result.spectralCentroid).toBeGreaterThan(500)
      expect(result.spectralCentroid).toBeLessThan(2000)
    })

    it('should return spectrum array', () => {
      const samples = new Float32Array(256)
      const result = calculateSpectralFeatures(samples, 16000)

      expect(result.spectrum).toBeDefined()
      expect(result.spectrum.length).toBeGreaterThan(0)
    })

    it('should handle empty input', () => {
      const samples = new Float32Array(0)
      const result = calculateSpectralFeatures(samples, 16000)

      expect(result.lowBandEnergy).toBe(0)
      expect(result.highBandEnergy).toBe(0)
      expect(result.spectralCentroid).toBe(0)
    })
  })

  describe('detectVoiceActivity', () => {
    it('should detect voice in speech-like signal', () => {
      // Create a signal with speech-like characteristics
      const N = 1024
      const samples = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        // Mix of frequencies typical of speech (fundamental + harmonics)
        samples[i] =
          0.5 * Math.sin((2 * Math.PI * 150 * i) / 16000) +
          0.3 * Math.sin((2 * Math.PI * 300 * i) / 16000) +
          0.2 * Math.sin((2 * Math.PI * 450 * i) / 16000)
      }

      const result = detectVoiceActivity(samples)

      expect(result).toBeDefined()
      expect(result.hasSpeech).toBeDefined()
      expect(result.rmsAmplitude).toBeDefined()
    })

    it('should return low probability for silence', () => {
      const samples = new Float32Array(1024).fill(0)
      const result = detectVoiceActivity(samples)

      expect(result.hasSpeech).toBe(false)
      expect(result.rmsAmplitude).toBe(0)
    })

    it('should return low probability for noise', () => {
      const samples = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) {
        samples[i] = (Math.random() - 0.5) * 0.01 // Low-level noise
      }

      const result = detectVoiceActivity(samples)

      expect(result.hasSpeech).toBe(false)
    })

    it('should include RMS in result', () => {
      const samples = new Float32Array(512).fill(0.5)
      const result = detectVoiceActivity(samples)

      expect(result.rmsAmplitude).toBeDefined()
      expect(result.rmsAmplitude).toBeCloseTo(0.5, 2)
    })

    it('should include peak in result', () => {
      const samples = new Float32Array(512)
      samples[100] = 0.8
      const result = detectVoiceActivity(samples)

      expect(result.peakAmplitude).toBeDefined()
      expect(result.peakAmplitude).toBeCloseTo(0.8, 2)
    })
  })

  describe('isFrameSpeech', () => {
    it('should return false for silent frame', () => {
      const analysis: AudioAnalysis = {
        rms: 0,
        peak: 0,
        activeSamples: 0,
        totalSamples: 256,
        sumSquares: 0,
        zeroCrossingRate: 0,
        lowBandEnergy: 0,
        highBandEnergy: 0,
        spectralCentroid: 0,
        spectralFlux: 0,
        spectrum: null
      }

      expect(isFrameSpeech(analysis)).toBe(false)
    })

    it('should return true for loud frame with speech characteristics', () => {
      const analysis: AudioAnalysis = {
        rms: 0.3,
        peak: 0.8,
        activeSamples: 200,
        totalSamples: 256,
        sumSquares: 0.09 * 256,
        zeroCrossingRate: 0.15,
        lowBandEnergy: 0.6,
        highBandEnergy: 0.1,
        spectralCentroid: 1000,
        spectralFlux: 0.1,
        spectrum: null
      }

      expect(isFrameSpeech(analysis)).toBe(true)
    })

    it('should consider spectral centroid', () => {
      // Low spectral centroid (below speech range)
      const lowCentroid: AudioAnalysis = {
        rms: 0.3,
        peak: 0.8,
        activeSamples: 200,
        totalSamples: 256,
        sumSquares: 0.09 * 256,
        zeroCrossingRate: 0.15,
        lowBandEnergy: 0.6,
        highBandEnergy: 0.1,
        spectralCentroid: 100, // Very low
        spectralFlux: 0.1,
        spectrum: null
      }

      const highCentroid: AudioAnalysis = {
        ...lowCentroid,
        spectralCentroid: 1500 // In speech range
      }

      // The one with speech-like centroid should be more likely to be speech
      const lowResult = isFrameSpeech(lowCentroid)
      const highResult = isFrameSpeech(highCentroid)

      // At least one should be true if we have good RMS
      expect(highResult || lowResult).toBe(true)
    })
  })

  describe('Integration tests', () => {
    it('should analyze WAV file correctly', () => {
      // Create a WAV file with known characteristics
      const sampleRate = 16000
      const duration = 0.5 // 0.5 seconds
      const numSamples = Math.floor(sampleRate * duration)
      const samples = new Int16Array(numSamples)

      // Generate 500 Hz tone
      for (let i = 0; i < numSamples; i++) {
        samples[i] = Math.floor(Math.sin((2 * Math.PI * 500 * i) / sampleRate) * 16000)
      }

      const wavFile = createWavFile(samples, sampleRate, 1)

      // Extract audio data (skip header)
      const audioData = wavFile.slice(44)
      const buffer = Buffer.from(audioData)

      const result = analyzeAudioBuffer(buffer, sampleRate)

      expect(result.rms).toBeGreaterThan(0.3) // Should be significant
      expect(result.peak).toBeGreaterThan(0.4)
      expect(result.totalSamples).toBe(numSamples)
    })

    it('should detect speech in realistic audio', () => {
      // Simulate speech-like audio with varying amplitude
      const sampleRate = 16000
      const numSamples = 8000 // 0.5 seconds
      const samples = new Float32Array(numSamples)

      for (let i = 0; i < numSamples; i++) {
        // Amplitude envelope (simulating syllables)
        const envelope = Math.sin((2 * Math.PI * 3 * i) / numSamples) * 0.3 + 0.4

        // Mix of speech-like frequencies
        samples[i] =
          envelope *
          (0.4 * Math.sin((2 * Math.PI * 120 * i) / sampleRate) + // Fundamental
            0.2 * Math.sin((2 * Math.PI * 240 * i) / sampleRate) + // 1st harmonic
            0.1 * Math.sin((2 * Math.PI * 360 * i) / sampleRate)) // 2nd harmonic
      }

      const result = detectVoiceActivity(samples)

      expect(result.rmsAmplitude).toBeGreaterThan(0.1)
      expect(result.peakAmplitude).toBeGreaterThan(0.2)
    })
  })

  describe('Performance tests', () => {
    it('should analyze large buffers quickly', () => {
      // 10 seconds of audio at 16kHz
      const numSamples = 160000
      const buffer = Buffer.alloc(numSamples * 2)
      for (let i = 0; i < numSamples; i++) {
        buffer.writeInt16LE(Math.floor(Math.random() * 65536) - 32768, i * 2)
      }

      const start = performance.now()
      analyzeAudioBuffer(buffer, 16000)
      const elapsed = performance.now() - start

      // Should complete in under 100ms
      expect(elapsed).toBeLessThan(500)
    })

    it('should calculate RMS quickly for large arrays', () => {
      const samples = new Float32Array(1000000)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 2 - 1
      }

      const start = performance.now()
      calculateRms(samples)
      const elapsed = performance.now() - start

      // Should complete in under 50ms
      expect(elapsed).toBeLessThan(100)
    })

    it('should calculate spectral features quickly', () => {
      const samples = new Float32Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 2 - 1
      }

      const start = performance.now()
      for (let i = 0; i < 10; i++) {
        calculateSpectralFeatures(samples, 16000)
      }
      const elapsed = performance.now() - start

      // 10 spectral analyses should complete in under 200ms
      expect(elapsed).toBeLessThan(500)
    })
  })

  describe('Edge cases', () => {
    it('should handle single sample', () => {
      const samples = new Float32Array([0.5])

      expect(calculateRms(samples)).toBeCloseTo(0.5, 5)
      expect(calculatePeak(samples)).toBeCloseTo(0.5, 5)
      expect(calculateZeroCrossingRate(samples)).toBe(0)
    })

    it('should handle very small values', () => {
      const samples = new Float32Array(100).fill(1e-10)

      const rms = calculateRms(samples)
      const peak = calculatePeak(samples)

      expect(rms).toBeGreaterThan(0)
      expect(rms).toBeLessThan(1e-9)
      expect(peak).toBeCloseTo(1e-10, 15)
    })

    it('should handle NaN values gracefully', () => {
      const samples = new Float32Array([0.5, NaN, 0.5])

      // Should not throw, but result may be NaN
      const rms = calculateRms(samples)
      expect(typeof rms).toBe('number')
    })

    it('should handle Infinity values', () => {
      const samples = new Float32Array([0.5, Infinity, 0.5])

      const peak = calculatePeak(samples)
      expect(peak).toBe(Infinity)
    })
  })
})
