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
 * Stream module for STT (Speech-to-Text) functionality
 * Exports types, audio analysis, chunk detection, and WAV utilities
 */

// Types and constants
export * from './types.js'

// Audio analysis functions
export {
  analyzeAudioBuffer,
  calculateSpectralFeatures,
  isFrameSpeech,
  getAdaptiveVADThreshold
} from './audio-analysis.js'

// Chunk detection functions
export {
  createAdaptiveVADState,
  updateNoiseFloor,
  updateSpeechRate,
  scoreCutPoint,
  findOptimalCutPoint,
  addToLookAheadBuffer,
  removeFromLookAheadBuffer,
  clearLookAheadBuffer,
  getLookAheadDuration
} from './chunk-detection.js'

// WAV utilities
export { createWavHeader, updateWavHeader, convertWavToOggOpus, sanitizePath } from './wav-utils.js'

// Main STT class
export { STT } from './stt.js'
