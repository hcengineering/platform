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
 * @hcengineering/audio-dsp
 *
 * Audio Digital Signal Processing library for Huly platform.
 *
 * Provides:
 * - WAV file handling (parsing, creating, header manipulation)
 * - FFT/IFFT operations for spectral analysis
 * - Audio analysis (VAD, RMS, spectral features)
 * - Noise reduction using spectral subtraction
 * - Audio normalization and gain control
 *
 * Works in both Node.js (CommonJS/ESM) and browser environments.
 */

// WAV file utilities
export {
  WAV_HEADER_SIZE,
  type WavHeader,
  createWavHeader,
  createWavHeaderBuffer,
  updateWavHeaderLength,
  parseWavHeader,
  getWavDuration,
  extractWavSamples,
  createWavFile,
  createWavFileFromFloat
} from './wav'

// FFT utilities
export {
  type Complex,
  isPowerOf2,
  nextPowerOf2,
  fftInPlace,
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
} from './fft'

// Audio analysis
export {
  type AudioAnalysis,
  type VadResult,
  type SpectralFeatures,
  analyzeAudio,
  analyzeAudioBuffer,
  calculateSpectralFeatures,
  detectVoiceActivity,
  isFrameSpeech,
  calculateRms,
  calculatePeak,
  calculateZeroCrossingRate
} from './analysis'

// Noise reduction
export {
  type NoiseReductionConfig,
  type NoiseReductionResult,
  DEFAULT_NOISE_REDUCTION_CONFIG,
  NoiseReducer,
  reduceNoiseFromWav,
  reduceNoise,
  estimateNoiseSpectrum
} from './noise-reduction'

// Audio normalization
export {
  type NormalizationConfig,
  type AudioStats,
  DEFAULT_NORMALIZATION_CONFIG,
  getAudioStats,
  normalizeAudio,
  normalizeAudioWithDcRemoval,
  normalizeWav,
  peakLimit,
  applyGain,
  calculateGainToTarget
} from './normalize'
