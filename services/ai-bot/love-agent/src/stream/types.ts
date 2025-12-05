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
 * Types and constants for STT (Speech-to-Text) module
 */

// ==================== Buffer Configuration ====================

/** Write buffer size in bytes - reduces syscalls */
export const WRITE_BUFFER_SIZE = 4096

// ==================== Chunk Timing Configuration ====================

/** Maximum duration per chunk in milliseconds (safety limit) */
export const MAX_CHUNK_DURATION_MS = 30000

/** Minimum duration per chunk in milliseconds to avoid tiny chunks */
export const MIN_CHUNK_DURATION_MS = 500

/** Milliseconds of speech required to start a new chunk */
export const SPEECH_START_THRESHOLD_MS = 100

// ==================== Adaptive Silence Thresholds ====================

/** Minimum silence threshold for fast speech (ms) */
export const SILENCE_THRESHOLD_MIN_MS = 400

/** Default silence threshold (ms) */
export const SILENCE_THRESHOLD_DEFAULT_MS = 600

/** Maximum silence threshold for slow/thoughtful speech (ms) */
export const SILENCE_THRESHOLD_MAX_MS = 1000

/** Look-ahead window for finding silence gaps (ms) */
export const LOOK_AHEAD_BUFFER_MS = 200

// ==================== Adaptive VAD Configuration ====================

/** How fast noise floor adapts (0-1) */
export const NOISE_FLOOR_ADAPTATION_RATE = 0.05

/** Initial noise floor estimate */
export const NOISE_FLOOR_INITIAL = 0.01

/** Minimum noise floor */
export const NOISE_FLOOR_MIN = 0.005

/** Maximum noise floor (very noisy environment) */
export const NOISE_FLOOR_MAX = 0.1

/** VAD threshold = noise floor * this margin */
export const VAD_MARGIN_ABOVE_NOISE = 2.0

// ==================== Speech Rate Detection ====================

/** Window for calculating speech rate (ms) */
export const SPEECH_RATE_WINDOW_MS = 5000

/** Speech ratio above this = fast speech */
export const FAST_SPEECH_THRESHOLD = 0.7

/** Speech ratio below this = slow/thoughtful speech */
export const SLOW_SPEECH_THRESHOLD = 0.3

// ==================== VAD Thresholds ====================

/** Default RMS threshold for voice activity (normalized 0-1) */
export const VAD_THRESHOLD_DEFAULT = 0.015

/** Per-frame threshold for counting active samples */
export const VAD_FRAME_THRESHOLD = 0.01

/** At least 10% of samples should be active for speech */
export const SPEECH_RATIO_THRESHOLD = 0.1

// ==================== Frequency Bands (assuming 16kHz sample rate) ====================

/** Lower bound of speech band (Hz) */
export const SPEECH_BAND_LOW = 300

/** Upper bound of speech band (Hz) */
export const SPEECH_BAND_HIGH = 3400

/** Lower bound of high frequency band (Hz) */
export const HIGH_BAND_LOW = 3400

/** Upper bound of high frequency band - Nyquist for 16kHz (Hz) */
export const HIGH_BAND_HIGH = 8000

// ==================== Spectral Centroid Thresholds ====================

/** Minimum spectral centroid for speech (Hz) */
export const SPEECH_CENTROID_MIN = 400

/** Maximum spectral centroid for speech (Hz) */
export const SPEECH_CENTROID_MAX = 3000

// ==================== Interfaces ====================

/**
 * Stream timing information
 */
export interface StreamTiming {
  /** Absolute timestamp when stream started (ms) */
  streamStartTime: number
  /** End time of the last frame (ms) */
  lastFrameEndTime: number
}

/**
 * Extended audio analysis result with VAD metrics
 */
export interface AudioAnalysis {
  /** Root Mean Square amplitude (0-1) */
  rms: number
  /** Peak amplitude (0-1) */
  peak: number
  /** Number of samples above VAD threshold */
  activeSamples: number
  /** Total number of samples in buffer */
  totalSamples: number
  /** Sum of squared sample values for RMS calculation */
  sumSquares: number
  /** Frequency of sign changes (speech typically 0.1-0.3) */
  zeroCrossingRate: number
  /** Energy in speech band 300-3400 Hz (normalized 0-1) */
  lowBandEnergy: number
  /** Energy in high frequencies 3400-8000 Hz (normalized 0-1) */
  highBandEnergy: number
  /** Center of mass of spectrum in Hz (speech typically 500-2000 Hz) */
  spectralCentroid: number
  /** Change in spectrum from previous frame (onset detection) */
  spectralFlux: number
  /** Cached spectrum for flux calculation */
  spectrum: Float64Array | null
}

/**
 * Pre-buffer frame with audio data and VAD analysis
 */
export interface PreBufferFrame {
  /** Audio data buffer */
  buf: Buffer
  /** Audio analysis results */
  analysis: AudioAnalysis
  /** Frame start timestamp (ms) */
  frameStartTime: number
  /** Frame end timestamp (ms) */
  frameEndTime: number
  /** Whether speech was detected in this frame */
  hasSpeech: boolean
}

/**
 * Look-ahead buffer frame for finding optimal cut points
 */
export interface LookAheadFrame {
  /** Audio data buffer */
  buf: Buffer
  /** Audio analysis results */
  analysis: AudioAnalysis
  /** Frame start timestamp (ms) */
  frameStartTime: number
  /** Frame end timestamp (ms) */
  frameEndTime: number
  /** Whether speech was detected in this frame */
  hasSpeech: boolean
}

/**
 * Speech history entry for rate tracking
 */
export interface SpeechHistoryEntry {
  /** Timestamp of the frame */
  time: number
  /** Whether speech was detected */
  hasSpeech: boolean
  /** Duration of the frame in ms */
  durationMs: number
}

/**
 * Adaptive VAD state - tracks noise floor and speech patterns
 */
export interface AdaptiveVADState {
  /** Current estimated noise floor (RMS) */
  noiseFloor: number
  /** Number of samples used for noise estimation */
  noiseFloorSamples: number
  /** Recent speech history for rate calculation */
  recentSpeechHistory: SpeechHistoryEntry[]
  /** Ratio of speech in recent window (0-1) */
  currentSpeechRate: number
  /** Current adaptive silence threshold in ms */
  adaptiveSilenceThresholdMs: number
  /** Previous frame spectrum for spectral flux calculation */
  previousFrameSpectrum: Float64Array | null
  /** Look-ahead buffer for finding optimal cut points */
  lookAheadBuffer: LookAheadFrame[]
  /** Total duration of frames in look-ahead buffer (ms) */
  lookAheadDurationMs: number
}

/**
 * State for current audio chunk being recorded
 */
export interface ChunkState {
  /** File descriptor for current chunk */
  fd: number | null
  /** Start timestamp of current chunk (ms) - absolute */
  chunkStartTime: number
  /** End timestamp of current chunk (ms) - absolute */
  chunkEndTime: number
  /** Current data length in bytes (excluding header) */
  chunkDataLength: number
  /** Current chunk file path */
  chunkFilePath: string | null
  /** Total samples in chunk */
  totalSamples: number
  /** Samples above VAD threshold */
  activeSamples: number
  /** Peak amplitude in chunk */
  peakAmplitude: number
  /** Sum of squares for RMS calculation */
  sumSquares: number
  /** Buffer for accumulating data before writing */
  writeBuffer: Buffer
  /** Current position in write buffer */
  writeBufferOffset: number
  /** Whether user is currently speaking */
  isSpeaking: boolean
  /** When current speech started (ms) */
  speechStartTime: number
  /** When silence started (ms) */
  silenceStartTime: number
  /** When last speech ended (ms) */
  lastSpeechEndTime: number
  /** Consecutive milliseconds of speech */
  consecutiveSpeechMs: number
  /** Consecutive milliseconds of silence */
  consecutiveSilenceMs: number
  /** Chunk index for this participant stream */
  chunkIndex: number
  /** Stores recent frames to capture speech start (ring buffer) */
  preBuffer: PreBufferFrame[]
  /** Total duration of frames in pre-buffer (ms) */
  preBufferDurationMs: number
  /** Adaptive VAD state */
  adaptiveVAD: AdaptiveVADState
}

/**
 * Full session state per participant
 */
export interface SessionState {
  /** File descriptor for full session WAV */
  fd: number | null
  /** Full session file path */
  filePath: string | null
  /** Total data length in bytes */
  dataLength: number
  /** Write buffer */
  writeBuffer: Buffer
  /** Current position in write buffer */
  writeBufferOffset: number
  /** Start time in seconds from meeting start */
  startTimeFromMeeting: number
  /** Number of frames written (debug) */
  frameCount: number
  /** Simple hash of last frame to detect duplicates (debug) */
  lastFrameHash: number
  /** Count of consecutive duplicate frames (for throttled logging) */
  duplicateCount?: number
}

/**
 * Metadata for audio chunk
 */
export interface ChunkMetadata {
  /** Start time in seconds from meeting start */
  startTimeSec: number
  /** End time in seconds from meeting start */
  endTimeSec: number
  /** Duration in seconds */
  durationSec: number
  /** Participant identity (Ref<Person>) for sending transcription */
  participant: string
  /** Participant display name for logging/files */
  participantName: string
  /** Audio sample rate (Hz) */
  sampleRate: number
  /** Number of audio channels */
  channels: number
  /** Bits per sample */
  bitsPerSample: number
  /** Why chunk was ended */
  endReason: 'silence' | 'max_duration' | 'stream_end'
  /** Ratio of speech to total duration (0-1) - informational only */
  speechRatio: number
  /** Peak amplitude (0-1 normalized) - informational only */
  peakAmplitude: number
  /** RMS amplitude (0-1 normalized) - informational only */
  rmsAmplitude: number
  /** ID of placeholder message created when speech started */
  placeholderMessageId?: string
}

/**
 * Candidate for chunk cut point
 */
export interface CutPointCandidate {
  /** Index in look-ahead buffer */
  index: number
  /** Duration of silence at this point (ms) */
  silenceDurationMs: number
  /** Calculated score for this cut point */
  score: number
}

/**
 * Result of spectral analysis
 */
export interface SpectralAnalysisResult {
  /** Normalized energy in speech band (0-1) */
  lowBandEnergy: number
  /** Normalized energy in high frequency band (0-1) */
  highBandEnergy: number
  /** Spectral centroid in Hz */
  spectralCentroid: number
  /** Magnitude spectrum */
  spectrum: Float64Array
}
