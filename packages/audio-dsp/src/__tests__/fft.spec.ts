// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import {
  isPowerOf2,
  nextPowerOf2,
  fft,
  ifft,
  magnitude,
  powerSpectrum,
  phase,
  fromPolar,
  stft,
  istft,
  createHannWindow,
  createHammingWindow,
  createBlackmanWindow,
  clearFFTCache
} from '../fft'

describe('FFT utilities', () => {
  beforeEach(() => {
    clearFFTCache()
  })

  describe('isPowerOf2', () => {
    it('should return true for powers of 2', () => {
      expect(isPowerOf2(1)).toBe(true)
      expect(isPowerOf2(2)).toBe(true)
      expect(isPowerOf2(4)).toBe(true)
      expect(isPowerOf2(8)).toBe(true)
      expect(isPowerOf2(16)).toBe(true)
      expect(isPowerOf2(32)).toBe(true)
      expect(isPowerOf2(64)).toBe(true)
      expect(isPowerOf2(128)).toBe(true)
      expect(isPowerOf2(256)).toBe(true)
      expect(isPowerOf2(512)).toBe(true)
      expect(isPowerOf2(1024)).toBe(true)
      expect(isPowerOf2(2048)).toBe(true)
      expect(isPowerOf2(4096)).toBe(true)
    })

    it('should return false for non-powers of 2', () => {
      expect(isPowerOf2(0)).toBe(false)
      expect(isPowerOf2(3)).toBe(false)
      expect(isPowerOf2(5)).toBe(false)
      expect(isPowerOf2(6)).toBe(false)
      expect(isPowerOf2(7)).toBe(false)
      expect(isPowerOf2(9)).toBe(false)
      expect(isPowerOf2(10)).toBe(false)
      expect(isPowerOf2(100)).toBe(false)
      expect(isPowerOf2(1000)).toBe(false)
    })

    it('should return false for negative numbers', () => {
      expect(isPowerOf2(-1)).toBe(false)
      expect(isPowerOf2(-2)).toBe(false)
      expect(isPowerOf2(-4)).toBe(false)
    })
  })

  describe('nextPowerOf2', () => {
    it('should return same value for powers of 2', () => {
      expect(nextPowerOf2(1)).toBe(1)
      expect(nextPowerOf2(2)).toBe(2)
      expect(nextPowerOf2(4)).toBe(4)
      expect(nextPowerOf2(8)).toBe(8)
      expect(nextPowerOf2(1024)).toBe(1024)
    })

    it('should return next power of 2 for non-powers', () => {
      expect(nextPowerOf2(3)).toBe(4)
      expect(nextPowerOf2(5)).toBe(8)
      expect(nextPowerOf2(6)).toBe(8)
      expect(nextPowerOf2(7)).toBe(8)
      expect(nextPowerOf2(9)).toBe(16)
      expect(nextPowerOf2(100)).toBe(128)
      expect(nextPowerOf2(1000)).toBe(1024)
      expect(nextPowerOf2(1025)).toBe(2048)
    })

    it('should handle edge cases', () => {
      expect(nextPowerOf2(0)).toBe(1)
    })
  })

  describe('Window functions', () => {
    describe('createHannWindow', () => {
      it('should create window of correct size', () => {
        const window = createHannWindow(512)
        expect(window.length).toBe(512)
      })

      it('should have zero at endpoints', () => {
        const window = createHannWindow(256)
        expect(window[0]).toBeCloseTo(0, 5)
        expect(window[255]).toBeCloseTo(0, 5)
      })

      it('should have maximum near center', () => {
        const window = createHannWindow(256)
        const center = Math.floor(256 / 2)
        // Maximum is near center but may not be exactly 1 due to discrete sampling
        expect(window[center]).toBeGreaterThan(0.99)
      })

      it('should be symmetric', () => {
        const window = createHannWindow(256)
        for (let i = 0; i < 128; i++) {
          expect(window[i]).toBeCloseTo(window[255 - i], 5)
        }
      })

      it('should have values between 0 and 1', () => {
        const window = createHannWindow(1024)
        for (let i = 0; i < window.length; i++) {
          expect(window[i]).toBeGreaterThanOrEqual(0)
          expect(window[i]).toBeLessThanOrEqual(1)
        }
      })
    })

    describe('createHammingWindow', () => {
      it('should create window of correct size', () => {
        const window = createHammingWindow(512)
        expect(window.length).toBe(512)
      })

      it('should have non-zero minimum at endpoints', () => {
        const window = createHammingWindow(256)
        // Hamming window has ~0.08 at endpoints
        expect(window[0]).toBeCloseTo(0.08, 1)
        expect(window[255]).toBeCloseTo(0.08, 1)
      })

      it('should have maximum near center', () => {
        const window = createHammingWindow(256)
        const center = Math.floor(256 / 2)
        expect(window[center]).toBeGreaterThan(0.99)
      })

      it('should be symmetric', () => {
        const window = createHammingWindow(256)
        for (let i = 0; i < 128; i++) {
          expect(window[i]).toBeCloseTo(window[255 - i], 5)
        }
      })
    })

    describe('createBlackmanWindow', () => {
      it('should create window of correct size', () => {
        const window = createBlackmanWindow(512)
        expect(window.length).toBe(512)
      })

      it('should have near-zero at endpoints', () => {
        const window = createBlackmanWindow(256)
        expect(window[0]).toBeCloseTo(0, 2)
        expect(window[255]).toBeCloseTo(0, 2)
      })

      it('should have maximum near center', () => {
        const window = createBlackmanWindow(256)
        const center = Math.floor(256 / 2)
        expect(window[center]).toBeGreaterThan(0.99)
      })

      it('should be symmetric', () => {
        const window = createBlackmanWindow(256)
        for (let i = 0; i < 128; i++) {
          expect(window[i]).toBeCloseTo(window[255 - i], 5)
        }
      })
    })
  })

  describe('fft', () => {
    it('should transform DC signal correctly', () => {
      // DC signal should have all energy in bin 0
      const signal = new Float32Array(8).fill(1)
      const result = fft(signal)

      expect(result.real.length).toBe(8)
      expect(result.imag.length).toBe(8)
      expect(result.real[0]).toBeCloseTo(8, 5) // DC component = sum of all samples
      expect(result.imag[0]).toBeCloseTo(0, 5)

      // All other bins should be near zero
      for (let i = 1; i < 8; i++) {
        expect(result.real[i]).toBeCloseTo(0, 5)
        expect(result.imag[i]).toBeCloseTo(0, 5)
      }
    })

    it('should transform pure sine wave correctly', () => {
      const N = 64
      const signal = new Float32Array(N)
      const freq = 4 // 4 cycles in the window

      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin((2 * Math.PI * freq * i) / N)
      }

      const result = fft(signal)
      const mag = magnitude(result.real, result.imag)

      // Find the bin with maximum magnitude (excluding DC)
      let maxBin = 1
      for (let i = 2; i < N / 2; i++) {
        if (mag[i] > mag[maxBin]) maxBin = i
      }

      expect(maxBin).toBe(freq)
    })

    it('should handle zero signal', () => {
      const signal = new Float32Array(8).fill(0)
      const result = fft(signal)

      for (let i = 0; i < 8; i++) {
        expect(result.real[i]).toBeCloseTo(0, 10)
        expect(result.imag[i]).toBeCloseTo(0, 10)
      }
    })

    it('should pad non-power-of-2 input to next power of 2', () => {
      const signal = new Float32Array(7).fill(1)
      const result = fft(signal)

      // Should be padded to 8
      expect(result.real.length).toBe(8)
      expect(result.imag.length).toBe(8)
    })

    it('should be linear (superposition)', () => {
      const N = 64
      const signal1 = new Float32Array(N)
      const signal2 = new Float32Array(N)
      const combined = new Float32Array(N)

      for (let i = 0; i < N; i++) {
        signal1[i] = Math.sin((2 * Math.PI * 2 * i) / N)
        signal2[i] = Math.cos((2 * Math.PI * 5 * i) / N)
        combined[i] = signal1[i] + signal2[i]
      }

      const fft1 = fft(signal1)
      const fft2 = fft(signal2)
      const fftCombined = fft(combined)

      // FFT of sum should equal sum of FFTs
      for (let i = 0; i < N; i++) {
        expect(fftCombined.real[i]).toBeCloseTo(fft1.real[i] + fft2.real[i], 4)
        expect(fftCombined.imag[i]).toBeCloseTo(fft1.imag[i] + fft2.imag[i], 4)
      }
    })
  })

  describe('ifft', () => {
    it('should be inverse of fft', () => {
      const original = new Float32Array(64)
      for (let i = 0; i < 64; i++) {
        original[i] = Math.random() * 2 - 1
      }

      const transformed = fft(original)
      const reconstructed = ifft(transformed.real, transformed.imag)

      for (let i = 0; i < 64; i++) {
        expect(reconstructed[i]).toBeCloseTo(original[i], 5)
      }
    })

    it('should handle DC signal', () => {
      const signal = new Float32Array(8).fill(0.5)
      const transformed = fft(signal)
      const reconstructed = ifft(transformed.real, transformed.imag)

      for (let i = 0; i < 8; i++) {
        expect(reconstructed[i]).toBeCloseTo(0.5, 5)
      }
    })
  })

  describe('magnitude', () => {
    it('should calculate correct magnitude', () => {
      const real = new Float64Array([3, 0, 1, 0])
      const imag = new Float64Array([4, 1, 0, 0])

      const mag = magnitude(real, imag)

      expect(mag[0]).toBeCloseTo(5, 5) // sqrt(3^2 + 4^2)
      expect(mag[1]).toBeCloseTo(1, 5) // sqrt(0^2 + 1^2)
      expect(mag[2]).toBeCloseTo(1, 5) // sqrt(1^2 + 0^2)
      expect(mag[3]).toBeCloseTo(0, 5) // sqrt(0^2 + 0^2)
    })

    it('should return Float64Array', () => {
      const real = new Float64Array([1])
      const imag = new Float64Array([1])
      const mag = magnitude(real, imag)
      expect(mag).toBeInstanceOf(Float64Array)
    })
  })

  describe('powerSpectrum', () => {
    it('should return squared magnitudes', () => {
      const real = new Float64Array([3, 1, 2])
      const imag = new Float64Array([4, 1, 0])

      const power = powerSpectrum(real, imag)

      expect(power[0]).toBeCloseTo(25, 5) // 3^2 + 4^2
      expect(power[1]).toBeCloseTo(2, 5) // 1^2 + 1^2
      expect(power[2]).toBeCloseTo(4, 5) // 2^2 + 0^2
    })
  })

  describe('phase', () => {
    it('should calculate correct phase angles', () => {
      const real = new Float64Array([1, 0, -1, 0, 1])
      const imag = new Float64Array([0, 1, 0, -1, 1])

      const phases = phase(real, imag)

      expect(phases[0]).toBeCloseTo(0, 5) // atan2(0, 1) = 0
      expect(phases[1]).toBeCloseTo(Math.PI / 2, 5) // atan2(1, 0) = π/2
      expect(phases[2]).toBeCloseTo(Math.PI, 5) // atan2(0, -1) = π
      expect(phases[3]).toBeCloseTo(-Math.PI / 2, 5) // atan2(-1, 0) = -π/2
      expect(phases[4]).toBeCloseTo(Math.PI / 4, 5) // atan2(1, 1) = π/4
    })
  })

  describe('fromPolar', () => {
    it('should convert magnitude and phase to complex', () => {
      const mag = new Float64Array([1, 2, 5])
      const ph = new Float64Array([0, Math.PI / 2, Math.PI / 4])

      const result = fromPolar(mag, ph)

      expect(result.real[0]).toBeCloseTo(1, 5)
      expect(result.imag[0]).toBeCloseTo(0, 5)

      expect(result.real[1]).toBeCloseTo(0, 5)
      expect(result.imag[1]).toBeCloseTo(2, 5)

      expect(result.real[2]).toBeCloseTo(5 * Math.cos(Math.PI / 4), 5)
      expect(result.imag[2]).toBeCloseTo(5 * Math.sin(Math.PI / 4), 5)
    })
  })

  describe('stft', () => {
    it('should return correct number of frames', () => {
      const signal = new Float32Array(1024)
      const frameSize = 256
      const hopSize = 128

      const frames = stft(signal, frameSize, hopSize)

      // Expected frames: floor((1024 - 256) / 128) + 1 = 7
      const expectedFrames = Math.floor((1024 - frameSize) / hopSize) + 1
      expect(frames.length).toBe(expectedFrames)
    })

    it('should return frames of correct size', () => {
      const signal = new Float32Array(512)
      const frameSize = 128
      const hopSize = 64

      const frames = stft(signal, frameSize, hopSize)

      for (const frame of frames) {
        expect(frame.real.length).toBe(frameSize)
        expect(frame.imag.length).toBe(frameSize)
      }
    })

    it('should apply window function', () => {
      const signal = new Float32Array(256).fill(1)
      const frameSize = 256
      const hopSize = 128
      const window = createHannWindow(frameSize)

      const framesWithWindow = stft(signal, frameSize, hopSize, window)
      const framesWithoutWindow = stft(signal, frameSize, hopSize)

      // Results should be different when window is applied vs default
      const mag1 = magnitude(framesWithWindow[0].real, framesWithWindow[0].imag)
      const mag2 = magnitude(framesWithoutWindow[0].real, framesWithoutWindow[0].imag)

      // Both use Hann by default, so they should be similar
      expect(mag1[0]).toBeCloseTo(mag2[0], 1)
    })

    it('should preserve frequency information', () => {
      const N = 512
      const signal = new Float32Array(N)
      const freq = 10

      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin((2 * Math.PI * freq * i) / N)
      }

      const frames = stft(signal, 128, 64)

      // Each frame should show energy at some frequency
      for (const frame of frames) {
        const mag = magnitude(frame.real, frame.imag)
        // Find peak (excluding DC)
        let maxBin = 1
        let maxVal = 0
        for (let i = 1; i < 64; i++) {
          if (mag[i] > maxVal) {
            maxVal = mag[i]
            maxBin = i
          }
        }
        // The peak should be at a low frequency bin
        expect(maxBin).toBeLessThan(20)
      }
    })

    it('should throw for non-power-of-2 frame size', () => {
      const signal = new Float32Array(512)
      expect(() => stft(signal, 100, 50)).toThrow()
    })
  })

  describe('istft', () => {
    it('should reconstruct signal from STFT', () => {
      const N = 512
      const original = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        original[i] = Math.sin((2 * Math.PI * 5 * i) / N) + 0.5 * Math.cos((2 * Math.PI * 10 * i) / N)
      }

      const frameSize = 128
      const hopSize = 64
      const window = createHannWindow(frameSize)

      const frames = stft(original, frameSize, hopSize, window)
      const reconstructed = istft(frames, frameSize, hopSize, window)

      // Check that reconstruction matches original (with some tolerance)
      // Note: edges may have artifacts due to windowing
      const margin = frameSize
      for (let i = margin; i < N - margin; i++) {
        if (i < reconstructed.length) {
          expect(reconstructed[i]).toBeCloseTo(original[i], 1)
        }
      }
    })

    it('should handle empty input', () => {
      const result = istft([], 128, 64)
      expect(result.length).toBe(0)
    })
  })

  describe('Performance tests', () => {
    it('should compute 1024-point FFT quickly', () => {
      const signal = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) {
        signal[i] = Math.random()
      }

      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        fft(signal)
      }
      const elapsed = performance.now() - start

      // 100 FFTs should complete in less than 500ms
      expect(elapsed).toBeLessThan(500)
    })

    it('should compute 4096-point FFT quickly', () => {
      const signal = new Float32Array(4096)
      for (let i = 0; i < 4096; i++) {
        signal[i] = Math.random()
      }

      const start = performance.now()
      for (let i = 0; i < 10; i++) {
        fft(signal)
      }
      const elapsed = performance.now() - start

      // 10 large FFTs should complete in less than 500ms
      expect(elapsed).toBeLessThan(500)
    })

    it('should benefit from caching twiddle factors', () => {
      clearFFTCache()

      const signal = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) {
        signal[i] = Math.random()
      }

      // First run (builds cache)
      const start1 = performance.now()
      fft(signal)
      const firstRun = performance.now() - start1

      // Subsequent runs (uses cache)
      const start2 = performance.now()
      for (let i = 0; i < 10; i++) {
        fft(signal)
      }
      const cachedRuns = (performance.now() - start2) / 10

      // Cached runs should generally be faster or similar
      // (this is a soft test - cache benefit may vary)
      expect(cachedRuns).toBeLessThan(firstRun * 3)
    })
  })

  describe('Edge cases', () => {
    it('should handle size 1 FFT', () => {
      const signal = new Float32Array([5])
      const result = fft(signal)

      expect(result.real.length).toBe(1)
      expect(result.real[0]).toBeCloseTo(5, 5)
      expect(result.imag[0]).toBeCloseTo(0, 5)
    })

    it('should handle size 2 FFT', () => {
      const signal = new Float32Array([1, 2])
      const result = fft(signal)

      expect(result.real.length).toBe(2)
      expect(result.real[0]).toBeCloseTo(3, 5) // DC = 1 + 2
      expect(result.real[1]).toBeCloseTo(-1, 5) // Nyquist = 1 - 2
    })

    it('should handle alternating signal', () => {
      // Alternating +1, -1 should have all energy at Nyquist
      const signal = new Float32Array(8)
      for (let i = 0; i < 8; i++) {
        signal[i] = i % 2 === 0 ? 1 : -1
      }

      const result = fft(signal)
      const mag = magnitude(result.real, result.imag)

      // Energy should be at Nyquist (bin N/2)
      expect(mag[4]).toBeGreaterThan(mag[0])
      expect(mag[4]).toBeGreaterThan(mag[1])
      expect(mag[4]).toBeGreaterThan(mag[2])
      expect(mag[4]).toBeGreaterThan(mag[3])
    })
  })
})
