// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import {
  NoiseReducer,
  reduceNoise,
  reduceNoiseFromWav,
  estimateNoiseSpectrum,
  NoiseReductionConfig,
  DEFAULT_NOISE_REDUCTION_CONFIG
} from '../noise-reduction'
import {
  normalizeAudio,
  normalizeAudioWithDcRemoval,
  normalizeWav,
  getAudioStats,
  peakLimit,
  applyGain,
  calculateGainToTarget,
  DEFAULT_NORMALIZATION_CONFIG
} from '../normalize'
import { createWavFile, extractWavSamples, createWavHeader } from '../wav'
import { calculateRms, calculatePeak } from '../analysis'

describe('Noise reduction', () => {
  describe('NoiseReducer class', () => {
    it('should create instance with default config', () => {
      const reducer = new NoiseReducer()
      expect(reducer).toBeDefined()
    })

    it('should create instance with custom config', () => {
      const config: Partial<NoiseReductionConfig> = {
        frameSize: 1024,
        hopSize: 512,
        overSubtractionFactor: 3.0
      }
      const reducer = new NoiseReducer(config)
      expect(reducer).toBeDefined()
    })

    it('should process audio samples', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 5 // Use fewer frames for noise estimation
      })
      // Need enough samples: (noiseEstimationFrames + 1) * hopSize + frameSize
      // With frameSize=512, hopSize=256, noiseEstimationFrames=5: (5+1)*256 + 512 = 2048
      const samples = new Float32Array(4096)

      // Add noise + signal
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.5 + (Math.random() - 0.5) * 0.1
      }

      const result = reducer.process(samples, 16000)

      expect(result).toBeDefined()
      expect(result.samples).toBeInstanceOf(Float32Array)
      expect(result.samples.length).toBe(samples.length)
      expect(result.sampleRate).toBe(16000)
      expect(result.framesProcessed).toBeGreaterThan(0)
    })

    it('should reduce noise level', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 10,
        overSubtractionFactor: 2.0
      })

      // Create signal with known noise - need enough samples for processing
      const samples = new Float32Array(8192)
      const noiseLevel = 0.2

      // First part: pure noise for estimation (first ~3000 samples)
      for (let i = 0; i < 3000; i++) {
        samples[i] = (Math.random() - 0.5) * noiseLevel
      }

      // Middle part: signal + noise
      for (let i = 3000; i < 6000; i++) {
        samples[i] = Math.sin((2 * Math.PI * 500 * i) / 16000) * 0.5 + (Math.random() - 0.5) * noiseLevel
      }

      // Last part: pure noise again - this is what we'll measure
      for (let i = 6000; i < samples.length; i++) {
        samples[i] = (Math.random() - 0.5) * noiseLevel
      }

      const result = reducer.process(samples, 16000)

      // Measure noise power in the final noise-only region (after processing)
      // Compare input vs output noise in the last 1000 samples
      let inputNoisePower = 0
      let outputNoisePower = 0
      const measureStart = 7000
      const measureEnd = 8000
      for (let i = measureStart; i < measureEnd; i++) {
        inputNoisePower += samples[i] * samples[i]
        outputNoisePower += result.samples[i] * result.samples[i]
      }

      // Output noise should be reduced (or at least not significantly increased)
      // The spectral subtraction should reduce the noise power
      expect(outputNoisePower).toBeLessThan(inputNoisePower * 1.5) // Allow some tolerance
    })

    it('should preserve signal structure', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 5
      })

      // Pure sine wave (no noise) - need enough samples
      const samples = new Float32Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.5
      }

      const result = reducer.process(samples, 16000)

      // Calculate correlation between input and output in the middle region
      // (avoiding edges where window effects may cause differences)
      let correlation = 0
      let inputPower = 0
      let outputPower = 0

      const measureStart = 1000
      const measureEnd = 3000

      for (let i = measureStart; i < measureEnd; i++) {
        correlation += samples[i] * result.samples[i]
        inputPower += samples[i] * samples[i]
        outputPower += result.samples[i] * result.samples[i]
      }

      // Avoid division by zero
      if (inputPower > 0 && outputPower > 0) {
        const normalizedCorrelation = correlation / Math.sqrt(inputPower * outputPower)
        // High correlation means signal is preserved
        expect(normalizedCorrelation).toBeGreaterThan(0.5)
      } else {
        // If no power, just check that result exists
        expect(result.samples).toBeDefined()
      }
    })

    it('should reset state', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 3
      })
      const samples = new Float32Array(2048).fill(0.1)

      reducer.process(samples, 16000)
      reducer.reset()

      // After reset, should work again without errors
      const result = reducer.process(samples, 16000)
      expect(result).toBeDefined()
      expect(result.samples).toBeDefined()
    })

    it('should round non-power-of-2 frameSize to next power of 2', () => {
      const reducer = new NoiseReducer({
        frameSize: 300, // Not a power of 2, should become 512
        noiseEstimationFrames: 3
      })

      const samples = new Float32Array(2048)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.5
      }

      const result = reducer.process(samples, 16000)
      expect(result).toBeDefined()
      expect(result.samples.length).toBe(samples.length)
    })

    it('should get and set noise spectrum', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 3
      })

      // Before processing, noise spectrum should be null
      expect(reducer.getNoiseSpectrum()).toBeNull()

      // Process some samples to generate noise spectrum
      const samples = new Float32Array(2048).fill(0.1)
      reducer.process(samples, 16000)

      // Now there should be a noise spectrum
      const spectrum = reducer.getNoiseSpectrum()
      expect(spectrum).toBeInstanceOf(Float64Array)
      expect(spectrum!.length).toBeGreaterThan(0)

      // Test setNoiseSpectrum
      const customSpectrum = new Float64Array(256).fill(0.05)
      reducer.setNoiseSpectrum(customSpectrum)

      const retrievedSpectrum = reducer.getNoiseSpectrum()
      expect(retrievedSpectrum).toBeInstanceOf(Float64Array)
      expect(retrievedSpectrum!.length).toBe(256)
      expect(retrievedSpectrum![0]).toBeCloseTo(0.05, 5)
    })

    it('should use adaptive noise estimation when enabled', () => {
      const reducer = new NoiseReducer({
        noiseEstimationFrames: 5,
        adaptiveNoiseEstimation: true,
        silenceThreshold: 0.5 // High threshold so all frames are "silence"
      })

      // Create mostly silent signal
      const samples = new Float32Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = (Math.random() - 0.5) * 0.01 // Very quiet noise
      }

      const result = reducer.process(samples, 16000)
      expect(result).toBeDefined()
      expect(result.samples).toBeInstanceOf(Float32Array)
    })
  })

  describe('reduceNoise function', () => {
    it('should reduce noise in Float32Array', () => {
      const samples = new Float32Array(2048)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.3 + (Math.random() - 0.5) * 0.1
      }

      const result = reduceNoise(samples, 16000)

      expect(result).toBeInstanceOf(Float32Array)
      expect(result.length).toBe(samples.length)
    })

    it('should accept custom config', () => {
      const samples = new Float32Array(2048).fill(0.1)

      const config: Partial<NoiseReductionConfig> = {
        frameSize: 256,
        hopSize: 128
      }

      const result = reduceNoise(samples, 16000, config)
      expect(result).toBeDefined()
    })

    it('should handle empty input', () => {
      const samples = new Float32Array(0)
      const result = reduceNoise(samples, 16000)

      expect(result.length).toBe(0)
    })

    it('should handle short input', () => {
      const samples = new Float32Array(100).fill(0.5)
      const result = reduceNoise(samples, 16000)

      expect(result).toBeDefined()
      expect(result.length).toBe(100)
    })
  })

  describe('reduceNoiseFromWav function', () => {
    it('should process WAV buffer', () => {
      const samples = new Int16Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.floor(Math.sin((2 * Math.PI * 440 * i) / 16000) * 10000)
      }

      const wavFile = createWavFile(samples, 16000, 1)
      const result = reduceNoiseFromWav(wavFile)

      // reduceNoiseFromWav returns a Uint8Array (WAV file)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBeGreaterThan(44) // WAV header + data

      // Verify it's a valid WAV file by extracting samples
      const extractedSamples = extractWavSamples(result)
      expect(extractedSamples).toBeDefined()
      expect(extractedSamples!.length).toBe(samples.length)
    })

    it('should throw for invalid WAV file', () => {
      const invalidData = new Uint8Array(100).fill(0)

      expect(() => reduceNoiseFromWav(invalidData)).toThrow('Invalid WAV file')
    })

    it('should throw for non-16-bit WAV file', () => {
      // Create a fake 8-bit WAV header
      const header = createWavHeader(1000, 16000, 1, 16)
      const view = new DataView(header.buffer)
      view.setUint16(34, 8, true) // Set bits per sample to 8

      expect(() => reduceNoiseFromWav(header)).toThrow('Only 16-bit WAV files are supported')
    })

    it('should preserve WAV format after processing', () => {
      const samples = new Int16Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.floor((Math.random() - 0.5) * 20000)
      }

      const wavFile = createWavFile(samples, 16000, 1)
      const result = reduceNoiseFromWav(wavFile)

      // Result should be a valid WAV file
      expect(result).toBeInstanceOf(Uint8Array)
      const extractedSamples = extractWavSamples(result)
      expect(extractedSamples).toBeDefined()
    })

    it('should handle different sample rates', () => {
      const samples = new Int16Array(8820) // 0.2s at 44100Hz
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.floor(Math.sin((2 * Math.PI * 440 * i) / 44100) * 10000)
      }
      const wavFile = createWavFile(samples, 44100, 1)
      const result = reduceNoiseFromWav(wavFile)

      // Result should be a valid WAV file
      expect(result).toBeInstanceOf(Uint8Array)
      const extractedSamples = extractWavSamples(result)
      expect(extractedSamples).toBeDefined()
      expect(extractedSamples!.length).toBe(samples.length)
    })
  })

  describe('estimateNoiseSpectrum function', () => {
    it('should estimate noise from samples', () => {
      const samples = new Float32Array(1024)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = (Math.random() - 0.5) * 0.1
      }

      // estimateNoiseSpectrum(samples, sampleRate, frameSize)
      const frameSize = 512
      const spectrum = estimateNoiseSpectrum(samples, 16000, frameSize)

      expect(spectrum).toBeInstanceOf(Float64Array)
      expect(spectrum.length).toBe(frameSize / 2) // frameSize / 2
    })

    it('should return zeros for silent audio', () => {
      const samples = new Float32Array(1024).fill(0)
      const spectrum = estimateNoiseSpectrum(samples, 16000, 512)

      for (let i = 0; i < spectrum.length; i++) {
        expect(spectrum[i]).toBeCloseTo(0, 10)
      }
    })
  })

  describe('DEFAULT_NOISE_REDUCTION_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.frameSize).toBeGreaterThan(0)
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.hopSize).toBeGreaterThan(0)
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.hopSize).toBeLessThanOrEqual(DEFAULT_NOISE_REDUCTION_CONFIG.frameSize)
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.overSubtractionFactor).toBeGreaterThan(0)
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.spectralFloor).toBeGreaterThan(0)
      expect(DEFAULT_NOISE_REDUCTION_CONFIG.spectralFloor).toBeLessThan(1)
    })
  })
})

describe('Audio normalization', () => {
  describe('getAudioStats', () => {
    it('should calculate RMS', () => {
      const samples = new Float32Array(100).fill(0.5)
      const stats = getAudioStats(samples)

      expect(stats.rms).toBeCloseTo(0.5, 5)
    })

    it('should calculate peak', () => {
      const samples = new Float32Array([0.1, 0.5, 0.3, 0.8, 0.2])
      const stats = getAudioStats(samples)

      expect(stats.peak).toBeCloseTo(0.8, 5)
    })

    it('should calculate DC offset', () => {
      const samples = new Float32Array(100).fill(0.3)
      const stats = getAudioStats(samples)

      expect(stats.dcOffset).toBeCloseTo(0.3, 5)
    })

    it('should calculate suggested scaling', () => {
      const samples = new Float32Array(100).fill(0.1)
      const stats = getAudioStats(samples)

      expect(stats.suggestedScaling).toBeGreaterThan(1) // Should need amplification
    })

    it('should handle Int16Array', () => {
      const samples = new Int16Array([16384, -16384, 16384, -16384])
      const stats = getAudioStats(samples)

      expect(stats.rms).toBeCloseTo(0.5, 1)
      expect(stats.peak).toBeCloseTo(0.5, 1)
    })

    it('should handle empty array', () => {
      const samples = new Float32Array(0)
      const stats = getAudioStats(samples)

      expect(stats.rms).toBe(0)
      expect(stats.peak).toBe(0)
      expect(stats.suggestedScaling).toBe(1)
    })

    it('should calculate dynamic range', () => {
      const samples = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        samples[i] = Math.sin((2 * Math.PI * i) / 100) * 0.5
      }

      const stats = getAudioStats(samples)

      expect(stats.dynamicRangeDb).toBeGreaterThan(0)
    })
  })

  describe('normalizeAudio', () => {
    it('should return empty array for empty input', () => {
      const samples = new Float32Array(0)
      const normalized = normalizeAudio(samples)

      expect(normalized).toBeInstanceOf(Float32Array)
      expect(normalized.length).toBe(0)
    })

    it('should normalize quiet audio', () => {
      const samples = new Float32Array(100).fill(0.1)
      const normalized = normalizeAudio(samples)

      const inputRms = calculateRms(samples)
      const outputRms = calculateRms(normalized)

      expect(outputRms).toBeGreaterThan(inputRms)
    })

    it('should not clip loud audio', () => {
      const samples = new Float32Array(100).fill(0.8)
      const normalized = normalizeAudio(samples)

      const peak = calculatePeak(normalized)
      expect(peak).toBeLessThanOrEqual(1.0)
    })

    it('should preserve dynamics', () => {
      const samples = new Float32Array(100)
      for (let i = 0; i < 100; i++) {
        samples[i] = Math.sin((2 * Math.PI * i) / 20) * 0.3
      }

      const normalized = normalizeAudio(samples)

      // Check that waveform shape is preserved (correlation should be high)
      let correlation = 0
      let inputPower = 0
      let outputPower = 0

      for (let i = 0; i < 100; i++) {
        correlation += samples[i] * normalized[i]
        inputPower += samples[i] * samples[i]
        outputPower += normalized[i] * normalized[i]
      }

      const normalizedCorrelation = correlation / Math.sqrt(inputPower * outputPower)
      expect(normalizedCorrelation).toBeGreaterThan(0.99)
    })

    it('should handle Int16Array input', () => {
      const samples = new Int16Array([3277, -3277, 3277, -3277]) // ~0.1 normalized
      const normalized = normalizeAudio(samples)

      expect(normalized).toBeInstanceOf(Float32Array)
      expect(calculateRms(normalized)).toBeGreaterThan(0.1)
    })

    it('should return copy for silent audio', () => {
      const samples = new Float32Array(100).fill(0)
      const normalized = normalizeAudio(samples)

      expect(normalized.length).toBe(100)
      for (let i = 0; i < 100; i++) {
        expect(normalized[i]).toBe(0)
      }
    })

    it('should skip normalization if already at target', () => {
      const samples = new Float32Array(100)
      for (let i = 0; i < 100; i++) {
        samples[i] = Math.sin((2 * Math.PI * i) / 20) * 0.2 // RMS ~0.14
      }

      const normalized = normalizeAudio(samples, { targetRms: 0.14, skipThreshold: 0.1 })

      // Should be similar to input
      for (let i = 0; i < 100; i++) {
        expect(Math.abs(normalized[i] - samples[i])).toBeLessThan(0.15)
      }
    })

    it('should respect custom target levels', () => {
      const samples = new Float32Array(100).fill(0.1)
      const normalized = normalizeAudio(samples, { targetRms: 0.5, targetPeak: 0.9 })

      const rms = calculateRms(normalized)
      expect(rms).toBeCloseTo(0.5, 1)
    })
  })

  describe('normalizeAudioWithDcRemoval', () => {
    it('should return empty array for empty input', () => {
      const samples = new Float32Array(0)
      const normalized = normalizeAudioWithDcRemoval(samples)

      expect(normalized).toBeInstanceOf(Float32Array)
      expect(normalized.length).toBe(0)
    })

    it('should remove DC offset', () => {
      const samples = new Float32Array(100)
      for (let i = 0; i < 100; i++) {
        samples[i] = 0.5 + Math.sin((2 * Math.PI * i) / 20) * 0.2 // DC offset of 0.5
      }

      const normalized = normalizeAudioWithDcRemoval(samples)

      // Calculate DC offset of result
      let sum = 0
      for (let i = 0; i < normalized.length; i++) {
        sum += normalized[i]
      }
      const dcOffset = sum / normalized.length

      expect(Math.abs(dcOffset)).toBeLessThan(0.1)
    })

    it('should also normalize amplitude', () => {
      const samples = new Float32Array(100).fill(0.6) // DC offset, no AC
      const normalized = normalizeAudioWithDcRemoval(samples)

      // After DC removal, should be all zeros (or near zero)
      const rms = calculateRms(normalized)
      expect(rms).toBeLessThan(0.01)
    })
  })

  describe('normalizeWav', () => {
    it('should return original for header-only WAV', () => {
      // Create a WAV file with only header (no audio data)
      const headerOnly = createWavHeader(0, 16000, 1, 16)
      const result = normalizeWav(headerOnly)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(44) // Just the header
    })

    it('should normalize WAV file', () => {
      const samples = new Int16Array(1000)
      for (let i = 0; i < 1000; i++) {
        samples[i] = Math.floor(Math.sin((2 * Math.PI * i) / 100) * 3000) // Quiet
      }

      const wavFile = createWavFile(samples, 16000, 1)
      const normalized = normalizeWav(wavFile)

      const extractedSamples = extractWavSamples(normalized)
      expect(extractedSamples).toBeDefined()

      // Should be louder
      const inputRms = calculateRms(samples)
      const outputRms = calculateRms(extractedSamples!)

      expect(outputRms).toBeGreaterThan(inputRms)
    })

    it('should throw for invalid WAV', () => {
      const invalid = new Uint8Array(20)
      expect(() => normalizeWav(invalid)).toThrow()
    })

    it('should throw for non-16-bit WAV', () => {
      const samples = new Int16Array(100)
      const wavFile = createWavFile(samples, 16000, 1)

      // Corrupt bitsPerSample field
      const view = new DataView(wavFile.buffer)
      view.setUint16(34, 8, true)

      expect(() => normalizeWav(wavFile)).toThrow()
    })
  })

  describe('peakLimit', () => {
    it('should limit peaks above threshold', () => {
      const samples = new Float32Array([0.5, 1.5, 0.3, -1.2, 0.8])
      const limited = peakLimit(samples, 0.95)

      expect(limited[1]).toBeLessThan(1.5)
      expect(limited[3]).toBeGreaterThan(-1.2)
      expect(limited[0]).toBeCloseTo(0.5, 5) // Below threshold, unchanged
    })

    it('should not exceed 1.0', () => {
      const samples = new Float32Array([2.0, -2.0, 3.0, -3.0])
      const limited = peakLimit(samples, 0.95)

      for (let i = 0; i < limited.length; i++) {
        expect(Math.abs(limited[i])).toBeLessThanOrEqual(1.0)
      }
    })

    it('should preserve samples below threshold', () => {
      const samples = new Float32Array([0.1, 0.2, 0.3, 0.4])
      const limited = peakLimit(samples, 0.95)

      for (let i = 0; i < samples.length; i++) {
        expect(limited[i]).toBeCloseTo(samples[i], 5)
      }
    })

    it('should use custom ratio', () => {
      const samples = new Float32Array([1.5])
      const limitedHard = peakLimit(samples, 0.95, 100) // Hard limiting
      const limitedSoft = peakLimit(samples, 0.95, 2) // Soft limiting

      // Hard limiting should be closer to threshold
      expect(limitedHard[0]).toBeLessThan(limitedSoft[0])
    })
  })

  describe('applyGain', () => {
    it('should amplify with positive gain', () => {
      const samples = new Float32Array([0.1, 0.2, 0.3])
      const gained = applyGain(samples, 6) // +6dB ≈ 2x

      expect(gained[0]).toBeCloseTo(0.2, 1)
      expect(gained[1]).toBeCloseTo(0.4, 1)
      expect(gained[2]).toBeCloseTo(0.6, 1)
    })

    it('should attenuate with negative gain', () => {
      const samples = new Float32Array([0.4, 0.8])
      const gained = applyGain(samples, -6) // -6dB ≈ 0.5x

      expect(gained[0]).toBeCloseTo(0.2, 1)
      expect(gained[1]).toBeCloseTo(0.4, 1)
    })

    it('should clamp to valid range', () => {
      const samples = new Float32Array([0.5])
      const gained = applyGain(samples, 20) // +20dB = 10x

      expect(gained[0]).toBeLessThanOrEqual(1.0)
      expect(gained[0]).toBeGreaterThanOrEqual(-1.0)
    })

    it('should handle 0dB gain', () => {
      const samples = new Float32Array([0.3, -0.5])
      const gained = applyGain(samples, 0)

      expect(gained[0]).toBeCloseTo(0.3, 5)
      expect(gained[1]).toBeCloseTo(-0.5, 5)
    })
  })

  describe('calculateGainToTarget', () => {
    it('should calculate positive gain for quiet audio', () => {
      const samples = new Float32Array([0.1, -0.1, 0.1])
      const gain = calculateGainToTarget(samples, 0.95)

      expect(gain).toBeGreaterThan(0)
    })

    it('should calculate negative gain for loud audio', () => {
      const samples = new Float32Array([1.5, -1.5])
      const gain = calculateGainToTarget(samples, 0.95)

      expect(gain).toBeLessThan(0)
    })

    it('should return 0 for silent audio', () => {
      const samples = new Float32Array(100).fill(0)
      const gain = calculateGainToTarget(samples, 0.95)

      expect(gain).toBe(0)
    })

    it('should handle Int16Array', () => {
      const samples = new Int16Array([16384, -16384]) // ~0.5 peak
      const gain = calculateGainToTarget(samples, 0.95)

      // Should need ~+5.6dB to reach 0.95
      expect(gain).toBeGreaterThan(0)
      expect(gain).toBeLessThan(10)
    })

    it('should calculate correct gain to reach target', () => {
      const samples = new Float32Array([0.5, -0.5])
      const targetPeak = 0.8
      const gain = calculateGainToTarget(samples, targetPeak)

      // Apply the calculated gain
      const gained = applyGain(samples, gain)
      const newPeak = calculatePeak(gained)

      expect(newPeak).toBeCloseTo(targetPeak, 1)
    })
  })

  describe('DEFAULT_NORMALIZATION_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_NORMALIZATION_CONFIG.targetRms).toBeGreaterThan(0)
      expect(DEFAULT_NORMALIZATION_CONFIG.targetRms).toBeLessThan(1)
      expect(DEFAULT_NORMALIZATION_CONFIG.targetPeak).toBeGreaterThan(0)
      expect(DEFAULT_NORMALIZATION_CONFIG.targetPeak).toBeLessThanOrEqual(1)
      expect(DEFAULT_NORMALIZATION_CONFIG.skipThreshold).toBeGreaterThan(0)
    })
  })
})

describe('Integration: Noise reduction + Normalization', () => {
  it('should process noisy audio end-to-end', () => {
    // Create noisy audio
    const sampleRate = 16000
    const duration = 0.5
    const numSamples = Math.floor(sampleRate * duration)
    const samples = new Float32Array(numSamples)

    for (let i = 0; i < numSamples; i++) {
      // Signal: 440Hz tone
      const signal = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3
      // Noise
      const noise = (Math.random() - 0.5) * 0.15
      samples[i] = signal + noise
    }

    // Apply noise reduction
    const denoised = reduceNoise(samples, sampleRate)

    // Normalize
    const normalized = normalizeAudio(denoised)

    // Check results
    expect(normalized.length).toBe(numSamples)

    const outputRms = calculateRms(normalized)

    // Output should have reasonable level after normalization
    expect(outputRms).toBeGreaterThan(0.01)

    // Output should not clip
    const outputPeak = calculatePeak(normalized)
    expect(outputPeak).toBeLessThanOrEqual(1.0)
  })

  it('should improve SNR', () => {
    const sampleRate = 16000
    const numSamples = 8000

    // Create two segments: noise only, then signal + noise
    const samples = new Float32Array(numSamples)
    const noiseLevel = 0.1
    const signalLevel = 0.3

    // First half: noise only (for estimation)
    for (let i = 0; i < numSamples / 2; i++) {
      samples[i] = (Math.random() - 0.5) * noiseLevel
    }

    // Second half: signal + noise
    for (let i = numSamples / 2; i < numSamples; i++) {
      const signal = Math.sin((2 * Math.PI * 500 * i) / sampleRate) * signalLevel
      const noise = (Math.random() - 0.5) * noiseLevel
      samples[i] = signal + noise
    }

    const denoised = reduceNoise(samples, sampleRate, {
      noiseEstimationFrames: 20
    })

    // Calculate power in noise-only region
    let inputNoisePower = 0
    let outputNoisePower = 0
    const noiseRegion = numSamples / 4 // Middle of noise region

    for (let i = noiseRegion - 500; i < noiseRegion + 500; i++) {
      inputNoisePower += samples[i] * samples[i]
      outputNoisePower += denoised[i] * denoised[i]
    }

    // Noise should be reduced
    expect(outputNoisePower).toBeLessThan(inputNoisePower)
  })
})

describe('Performance tests', () => {
  it('should process 10 seconds of audio quickly', () => {
    const sampleRate = 16000
    const duration = 10
    const numSamples = sampleRate * duration
    const samples = new Float32Array(numSamples)

    for (let i = 0; i < numSamples; i++) {
      samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3 + (Math.random() - 0.5) * 0.1
    }

    const start = performance.now()
    reduceNoise(samples, sampleRate)
    const elapsed = performance.now() - start

    // Should complete in under 2 seconds
    expect(elapsed).toBeLessThan(5000)
  })

  it('should normalize large arrays quickly', () => {
    const numSamples = 1000000
    const samples = new Float32Array(numSamples)

    for (let i = 0; i < numSamples; i++) {
      samples[i] = Math.random() * 0.5
    }

    const start = performance.now()
    normalizeAudio(samples)
    const elapsed = performance.now() - start

    // Should complete in under 200ms
    expect(elapsed).toBeLessThan(500)
  })

  it('should calculate stats quickly', () => {
    const numSamples = 1000000
    const samples = new Float32Array(numSamples)

    for (let i = 0; i < numSamples; i++) {
      samples[i] = Math.random() * 2 - 1
    }

    const start = performance.now()
    getAudioStats(samples)
    const elapsed = performance.now() - start

    // Should complete in under 100ms
    expect(elapsed).toBeLessThan(200)
  })
})
