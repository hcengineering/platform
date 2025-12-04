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
 * Fast Fourier Transform (FFT) implementation using Cooley-Tukey algorithm
 *
 * This module provides efficient FFT/IFFT operations for audio processing.
 * Supports radix-2 FFT (input size must be power of 2).
 */

/**
 * Complex number representation for FFT operations
 */
export interface Complex {
  real: number
  imag: number
}

/**
 * Pre-computed FFT tables for a specific size
 */
interface FFTTables {
  size: number
  cosTable: Float64Array
  sinTable: Float64Array
  reverseTable: Uint32Array
}

// Cache for pre-computed FFT tables
const tablesCache = new Map<number, FFTTables>()

/**
 * Check if a number is a power of 2
 */
export function isPowerOf2 (n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

/**
 * Get the next power of 2 greater than or equal to n
 */
export function nextPowerOf2 (n: number): number {
  if (n <= 1) return 1
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

/**
 * Get or create FFT tables for a given size
 */
function getFFTTables (size: number): FFTTables {
  const cached = tablesCache.get(size)
  if (cached !== undefined) {
    return cached
  }

  if (!isPowerOf2(size)) {
    throw new Error(`FFT size must be a power of 2, got ${size}`)
  }

  const cosTable = new Float64Array(size / 2)
  const sinTable = new Float64Array(size / 2)
  const reverseTable = new Uint32Array(size)

  // Pre-compute twiddle factors
  for (let i = 0; i < size / 2; i++) {
    const angle = (-2 * Math.PI * i) / size
    cosTable[i] = Math.cos(angle)
    sinTable[i] = Math.sin(angle)
  }

  // Pre-compute bit-reversal permutation
  const bits = Math.log2(size)
  for (let i = 0; i < size; i++) {
    let reversed = 0
    for (let j = 0; j < bits; j++) {
      reversed = (reversed << 1) | ((i >> j) & 1)
    }
    reverseTable[i] = reversed
  }

  const tables: FFTTables = { size, cosTable, sinTable, reverseTable }
  tablesCache.set(size, tables)
  return tables
}

/**
 * In-place Cooley-Tukey FFT
 *
 * @param real - Real parts of input (will be modified in place)
 * @param imag - Imaginary parts of input (will be modified in place)
 * @param inverse - If true, compute inverse FFT
 */
export function fftInPlace (real: Float64Array, imag: Float64Array, inverse: boolean = false): void {
  const n = real.length

  if (real.length !== imag.length) {
    throw new Error('Real and imaginary arrays must have the same length')
  }

  if (!isPowerOf2(n)) {
    throw new Error(`FFT size must be a power of 2, got ${n}`)
  }

  const tables = getFFTTables(n)
  const { cosTable, sinTable, reverseTable } = tables

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = reverseTable[i]
    if (j > i) {
      // Swap real[i] and real[j]
      const tempReal = real[i]
      real[i] = real[j]
      real[j] = tempReal

      // Swap imag[i] and imag[j]
      const tempImag = imag[i]
      imag[i] = imag[j]
      imag[j] = tempImag
    }
  }

  // Cooley-Tukey iterative FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2
    const tableStep = n / size

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const tableIndex = j * tableStep
        const cos = cosTable[tableIndex]
        const sin = inverse ? -sinTable[tableIndex] : sinTable[tableIndex]

        const evenIndex = i + j
        const oddIndex = i + j + halfSize

        const evenReal = real[evenIndex]
        const evenImag = imag[evenIndex]
        const oddReal = real[oddIndex]
        const oddImag = imag[oddIndex]

        // Butterfly operation
        const tReal = cos * oddReal - sin * oddImag
        const tImag = cos * oddImag + sin * oddReal

        real[evenIndex] = evenReal + tReal
        imag[evenIndex] = evenImag + tImag
        real[oddIndex] = evenReal - tReal
        imag[oddIndex] = evenImag - tImag
      }
    }
  }

  // Normalize for inverse FFT
  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n
      imag[i] /= n
    }
  }
}

/**
 * Compute FFT of real-valued input
 *
 * @param input - Real-valued input samples
 * @returns Object containing real and imaginary parts of the FFT
 */
export function fft (input: Float32Array | Float64Array | number[]): { real: Float64Array, imag: Float64Array } {
  const n = nextPowerOf2(input.length)
  const real = new Float64Array(n)
  const imag = new Float64Array(n)

  // Copy input to real array (zero-padding if necessary)
  for (let i = 0; i < input.length; i++) {
    real[i] = input[i]
  }

  fftInPlace(real, imag, false)

  return { real, imag }
}

/**
 * Compute inverse FFT
 *
 * @param real - Real parts of input
 * @param imag - Imaginary parts of input
 * @returns Real-valued output samples
 */
export function ifft (real: Float64Array, imag: Float64Array): Float64Array {
  const n = real.length
  const outReal = new Float64Array(n)
  const outImag = new Float64Array(n)

  // Copy input
  for (let i = 0; i < n; i++) {
    outReal[i] = real[i]
    outImag[i] = imag[i]
  }

  fftInPlace(outReal, outImag, true)

  return outReal
}

/**
 * Compute magnitude spectrum from FFT output
 *
 * @param real - Real parts of FFT
 * @param imag - Imaginary parts of FFT
 * @returns Magnitude spectrum
 */
export function magnitude (real: Float64Array, imag: Float64Array): Float64Array {
  const n = real.length
  const mag = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
  }

  return mag
}

/**
 * Compute power spectrum (magnitude squared) from FFT output
 *
 * @param real - Real parts of FFT
 * @param imag - Imaginary parts of FFT
 * @returns Power spectrum
 */
export function powerSpectrum (real: Float64Array, imag: Float64Array): Float64Array {
  const n = real.length
  const power = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    power[i] = real[i] * real[i] + imag[i] * imag[i]
  }

  return power
}

/**
 * Compute phase spectrum from FFT output
 *
 * @param real - Real parts of FFT
 * @param imag - Imaginary parts of FFT
 * @returns Phase spectrum in radians
 */
export function phase (real: Float64Array, imag: Float64Array): Float64Array {
  const n = real.length
  const ph = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    ph[i] = Math.atan2(imag[i], real[i])
  }

  return ph
}

/**
 * Create complex spectrum from magnitude and phase
 *
 * @param magnitude - Magnitude spectrum
 * @param phase - Phase spectrum in radians
 * @returns Object containing real and imaginary parts
 */
export function fromPolar (mag: Float64Array, ph: Float64Array): { real: Float64Array, imag: Float64Array } {
  const n = mag.length
  const real = new Float64Array(n)
  const imag = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    real[i] = mag[i] * Math.cos(ph[i])
    imag[i] = mag[i] * Math.sin(ph[i])
  }

  return { real, imag }
}

/**
 * Short-Time Fourier Transform (STFT)
 *
 * @param samples - Input audio samples
 * @param frameSize - FFT frame size (must be power of 2)
 * @param hopSize - Hop size between frames
 * @param window - Window function to apply (optional, defaults to Hann window)
 * @returns Array of FFT frames, each containing real and imag parts
 */
export function stft (
  samples: Float32Array | Float64Array,
  frameSize: number,
  hopSize: number,
  window?: Float64Array
): Array<{ real: Float64Array, imag: Float64Array }> {
  if (!isPowerOf2(frameSize)) {
    throw new Error(`Frame size must be a power of 2, got ${frameSize}`)
  }

  const windowFunc = window ?? createHannWindow(frameSize)
  const frames: Array<{ real: Float64Array, imag: Float64Array }> = []

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const real = new Float64Array(frameSize)
    const imag = new Float64Array(frameSize)

    // Apply window and copy to real array
    for (let i = 0; i < frameSize; i++) {
      real[i] = samples[start + i] * windowFunc[i]
    }

    fftInPlace(real, imag, false)
    frames.push({ real, imag })
  }

  return frames
}

/**
 * Inverse Short-Time Fourier Transform (ISTFT)
 *
 * @param frames - Array of FFT frames from STFT
 * @param frameSize - FFT frame size
 * @param hopSize - Hop size between frames
 * @param window - Window function (optional, defaults to Hann window)
 * @returns Reconstructed audio samples
 */
export function istft (
  frames: Array<{ real: Float64Array, imag: Float64Array }>,
  frameSize: number,
  hopSize: number,
  window?: Float64Array
): Float64Array {
  if (frames.length === 0) {
    return new Float64Array(0)
  }

  const windowFunc = window ?? createHannWindow(frameSize)
  const outputLength = (frames.length - 1) * hopSize + frameSize
  const output = new Float64Array(outputLength)
  const windowSum = new Float64Array(outputLength)

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex]
    const real = new Float64Array(frame.real)
    const imag = new Float64Array(frame.imag)

    fftInPlace(real, imag, true)

    const start = frameIndex * hopSize

    // Overlap-add with window
    for (let i = 0; i < frameSize; i++) {
      output[start + i] += real[i] * windowFunc[i]
      windowSum[start + i] += windowFunc[i] * windowFunc[i]
    }
  }

  // Normalize by window sum (avoid division by zero)
  for (let i = 0; i < outputLength; i++) {
    if (windowSum[i] > 1e-8) {
      output[i] /= windowSum[i]
    }
  }

  return output
}

/**
 * Create a Hann (Hanning) window
 *
 * @param size - Window size
 * @returns Hann window coefficients
 */
export function createHannWindow (size: number): Float64Array {
  const window = new Float64Array(size)

  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
  }

  return window
}

/**
 * Create a Hamming window
 *
 * @param size - Window size
 * @returns Hamming window coefficients
 */
export function createHammingWindow (size: number): Float64Array {
  const window = new Float64Array(size)

  for (let i = 0; i < size; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1))
  }

  return window
}

/**
 * Create a Blackman window
 *
 * @param size - Window size
 * @returns Blackman window coefficients
 */
export function createBlackmanWindow (size: number): Float64Array {
  const window = new Float64Array(size)
  const a0 = 0.42
  const a1 = 0.5
  const a2 = 0.08

  for (let i = 0; i < size; i++) {
    const t = (2 * Math.PI * i) / (size - 1)
    window[i] = a0 - a1 * Math.cos(t) + a2 * Math.cos(2 * t)
  }

  return window
}

/**
 * Clear the FFT tables cache
 * Useful for freeing memory when FFT is no longer needed
 */
export function clearFFTCache (): void {
  tablesCache.clear()
}
