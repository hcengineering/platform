//
// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)
//

// A module to dump recordings into files with proper timestamps and user identification
// Uses smart VAD (Voice Activity Detection) to detect phrase boundaries
// Sends chunks immediately after detecting end of speech (silence)

import { AudioStream, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Room } from '@livekit/rtc-node'
import { randomUUID } from 'crypto'

import { Stt } from '../type.js'
import config from '../config.js'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'
import { spawn } from 'child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

/**
 * Sanitize a string for use in file paths - replace spaces and special characters
 */
function sanitizePath (name: string): string {
  return name.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_')
}

interface StreamTiming {
  streamStartTime: number // Absolute timestamp when stream started (ms)
  lastFrameEndTime: number // End time of the last frame (ms)
}

// Write buffer configuration
const WRITE_BUFFER_SIZE = 4096 // 4KB buffer - reduces syscalls

// Chunk timing configuration
const MAX_CHUNK_DURATION_MS = 30000 // Maximum 30 seconds per chunk (safety limit)
const MIN_CHUNK_DURATION_MS = 500 // Minimum 500ms to avoid tiny chunks
const SPEECH_START_THRESHOLD_MS = 100 // 100ms of speech to start a new chunk

// Adaptive silence thresholds based on speech rate
const SILENCE_THRESHOLD_MIN_MS = 400 // Minimum silence threshold for fast speech
const SILENCE_THRESHOLD_DEFAULT_MS = 600 // Default silence threshold
const SILENCE_THRESHOLD_MAX_MS = 1000 // Maximum silence threshold for slow/thoughtful speech

// Look-ahead buffer for finding optimal cut points
const LOOK_AHEAD_BUFFER_MS = 200 // Look-ahead window for finding silence gaps

// Adaptive VAD configuration
const NOISE_FLOOR_ADAPTATION_RATE = 0.05 // How fast noise floor adapts (0-1)
const NOISE_FLOOR_INITIAL = 0.01 // Initial noise floor estimate
const NOISE_FLOOR_MIN = 0.005 // Minimum noise floor
const NOISE_FLOOR_MAX = 0.1 // Maximum noise floor (very noisy environment)
const VAD_MARGIN_ABOVE_NOISE = 2.0 // VAD threshold = noise floor * this margin

// Speech rate detection
const SPEECH_RATE_WINDOW_MS = 5000 // Window for calculating speech rate
const FAST_SPEECH_THRESHOLD = 0.7 // Speech ratio above this = fast speech
const SLOW_SPEECH_THRESHOLD = 0.3 // Speech ratio below this = slow/thoughtful speech

// Extended audio analysis result
interface AudioAnalysis {
  rms: number
  peak: number
  activeSamples: number
  totalSamples: number
  sumSquares: number
  // New metrics for advanced VAD
  zeroCrossingRate: number // Frequency of sign changes (speech typically 0.1-0.3)
  lowBandEnergy: number // Energy in speech band (300-3400 Hz, normalized)
  highBandEnergy: number // Energy in high frequencies (3400-8000 Hz, normalized)
  spectralCentroid: number // Center of mass of spectrum (Hz) - speech typically 500-2000 Hz
  spectralFlux: number // Change in spectrum from previous frame (onset detection)
  // Cached spectrum for flux calculation
  spectrum: Float32Array | null
}

// Pre-buffer frame with audio data and VAD analysis
interface PreBufferFrame {
  buf: Buffer // Audio data
  analysis: AudioAnalysis
  frameStartTime: number
  frameEndTime: number
  hasSpeech: boolean
}

// Look-ahead buffer frame for finding optimal cut points
interface LookAheadFrame {
  buf: Buffer
  analysis: AudioAnalysis
  frameStartTime: number
  frameEndTime: number
  hasSpeech: boolean
}

// Adaptive VAD state - tracks noise floor and speech patterns
interface AdaptiveVADState {
  // Noise floor estimation (adaptive threshold)
  noiseFloor: number // Current estimated noise floor (RMS)
  noiseFloorSamples: number // Number of samples used for noise estimation

  // Speech rate tracking
  recentSpeechHistory: Array<{ time: number, hasSpeech: boolean, durationMs: number }>
  currentSpeechRate: number // Ratio of speech in recent window (0-1)

  // Adaptive silence threshold
  adaptiveSilenceThresholdMs: number

  // Previous frame spectrum for spectral flux calculation
  previousFrameSpectrum: Float32Array | null

  // Look-ahead buffer for finding optimal cut points
  lookAheadBuffer: LookAheadFrame[]
  lookAheadDurationMs: number
}

interface ChunkState {
  fd: number | null // File descriptor for current chunk
  chunkStartTime: number // Start timestamp of current chunk (ms) - absolute
  chunkEndTime: number // End timestamp of current chunk (ms) - absolute
  chunkDataLength: number // Current data length in bytes (excluding header)
  chunkFilePath: string | null // Current chunk file path
  // VAD metrics
  totalSamples: number // Total samples in chunk
  activeSamples: number // Samples above VAD threshold
  peakAmplitude: number // Peak amplitude in chunk
  sumSquares: number // Sum of squares for RMS calculation
  // Write buffer
  writeBuffer: Buffer // Buffer for accumulating data before writing
  writeBufferOffset: number // Current position in write buffer
  // VAD state for smart chunking
  isSpeaking: boolean // Whether user is currently speaking
  speechStartTime: number // When current speech started (ms)
  silenceStartTime: number // When silence started (ms)
  lastSpeechEndTime: number // When last speech ended (ms)
  consecutiveSpeechMs: number // Consecutive milliseconds of speech
  consecutiveSilenceMs: number // Consecutive milliseconds of silence
  chunkIndex: number // Chunk index for this participant stream
  // Pre-buffer for capturing speech start (ring buffer of recent frames)
  preBuffer: PreBufferFrame[] // Stores recent frames to capture speech start
  preBufferDurationMs: number // Total duration of frames in pre-buffer
  // Adaptive VAD state
  adaptiveVAD: AdaptiveVADState
}

// Full session state per participant
interface SessionState {
  fd: number | null // File descriptor for full session WAV
  filePath: string | null // Full session file path
  dataLength: number // Total data length in bytes
  writeBuffer: Buffer // Write buffer
  writeBufferOffset: number // Current position in write buffer
  startTimeFromMeeting: number // Start time in seconds from meeting start
  // Debug tracking
  frameCount: number // Number of frames written
  lastFrameHash: number // Simple hash of last frame to detect duplicates
}

interface ChunkMetadata {
  startTimeSec: number // Start time in seconds from meeting start
  endTimeSec: number // End time in seconds from meeting start
  durationSec: number // Duration in seconds
  participant: string // Participant identity (Ref<Person>) for sending transcription
  participantName: string // Participant display name for logging/files
  sampleRate: number
  channels: number
  bitsPerSample: number
  // VAD info (for debugging/logging only, not used for filtering)
  endReason: 'silence' | 'max_duration' | 'stream_end' // Why chunk was ended
  speechRatio: number // Ratio of speech to total duration (0-1) - informational only
  peakAmplitude: number // Peak amplitude (0-1 normalized) - informational only
  rmsAmplitude: number // RMS amplitude (0-1 normalized) - informational only
  // Placeholder message tracking
  placeholderMessageId?: string // ID of placeholder message created when speech started
}

const VAD_THRESHOLD_DEFAULT = 0.015 // Default RMS threshold for voice activity (normalized 0-1)
const VAD_FRAME_THRESHOLD = 0.01 // Per-frame threshold for counting active samples
const SPEECH_RATIO_THRESHOLD = 0.1 // At least 10% of samples should be active for speech

// Frequency bands for speech detection (assuming 16kHz sample rate)
const SPEECH_BAND_LOW = 300 // Hz - lower bound of speech band
const SPEECH_BAND_HIGH = 3400 // Hz - upper bound of speech band
const HIGH_BAND_LOW = 3400 // Hz - lower bound of high frequency band
const HIGH_BAND_HIGH = 8000 // Hz - upper bound of high frequency band (Nyquist for 16kHz)

// Spectral centroid thresholds for speech detection
const SPEECH_CENTROID_MIN = 400 // Hz - minimum centroid for speech
const SPEECH_CENTROID_MAX = 3000 // Hz - maximum centroid for speech

/**
 * Creates a WAV file header for PCM audio data
 */
function createWavHeader (dataLength: number, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const header = Buffer.alloc(44)

  // RIFF header
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLength, 4) // File size - 8
  header.write('WAVE', 8)

  // fmt chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // Audio format (1 = PCM)
  header.writeUInt16LE(channels, 22) // Number of channels
  header.writeUInt32LE(sampleRate, 24) // Sample rate
  header.writeUInt32LE(byteRate, 28) // Byte rate
  header.writeUInt16LE(blockAlign, 32) // Block align
  header.writeUInt16LE(bitsPerSample, 34) // Bits per sample

  // data chunk
  header.write('data', 36)
  header.writeUInt32LE(dataLength, 40) // Data size

  return header
}

/**
 * Updates WAV header with correct data length
 */
function updateWavHeader (fd: number, dataLength: number): void {
  const fileSizeBuffer = Buffer.alloc(4)
  const dataSizeBuffer = Buffer.alloc(4)

  // Update RIFF chunk size at offset 4
  fileSizeBuffer.writeUInt32LE(36 + dataLength, 0)
  writeSync(fd, fileSizeBuffer, 0, 4, 4)

  // Update data chunk size at offset 40
  dataSizeBuffer.writeUInt32LE(dataLength, 0)
  writeSync(fd, dataSizeBuffer, 0, 4, 40)
}

/**
 * Calculate RMS and detect voice activity for a buffer of 16-bit PCM samples
 * Enhanced with zero-crossing rate, band energy, spectral centroid, and spectral flux
 */
function analyzeAudioBuffer (
  buf: Buffer,
  sampleRate: number = 16000,
  previousSpectrum: Float32Array | null = null
): AudioAnalysis {
  const samples = buf.length / 2 // 16-bit samples
  let sumSquares = 0
  let peak = 0
  let activeSamples = 0
  let zeroCrossings = 0
  let previousSample = 0

  // Extract samples and calculate basic metrics
  const sampleArray = new Float32Array(samples)
  for (let i = 0; i < buf.length; i += 2) {
    const sample = buf.readInt16LE(i)
    const normalized = sample / 32768 // Normalize to -1 to 1
    const absNormalized = Math.abs(normalized)

    sampleArray[i / 2] = normalized
    sumSquares += normalized * normalized

    if (absNormalized > peak) {
      peak = absNormalized
    }
    if (absNormalized > VAD_FRAME_THRESHOLD) {
      activeSamples++
    }

    // Zero-crossing detection
    if (i > 0 && ((previousSample >= 0 && normalized < 0) || (previousSample < 0 && normalized >= 0))) {
      zeroCrossings++
    }
    previousSample = normalized
  }

  const rms = Math.sqrt(sumSquares / samples)
  const zeroCrossingRate = zeroCrossings / samples

  // Calculate band energies and spectral features
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
    totalSamples: samples,
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
 * Calculate spectral features: band energies, spectral centroid
 * Uses optimized DFT for speech-relevant frequency bands
 */
function calculateSpectralFeatures (
  samples: Float32Array,
  sampleRate: number
): {
    lowBandEnergy: number
    highBandEnergy: number
    spectralCentroid: number
    spectrum: Float32Array
  } {
  // Use a simple FFT-like approach with limited bins for efficiency
  const fftSize = Math.min(512, samples.length)
  const spectrum = new Float32Array(fftSize / 2)

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

  // Calculate magnitude spectrum using DFT
  const samplesToUse = Math.min(samples.length, fftSize)
  for (let k = 0; k < fftSize / 2; k++) {
    const frequency = k * binWidth
    const omega = (2 * Math.PI * k) / fftSize

    let real = 0
    let imag = 0

    for (let n = 0; n < samplesToUse; n++) {
      real += samples[n] * Math.cos(omega * n)
      imag += samples[n] * Math.sin(omega * n)
    }

    const magnitude = Math.sqrt(real * real + imag * imag) / samplesToUse
    spectrum[k] = magnitude
    const magnitudeSquared = magnitude * magnitude
    totalEnergy += magnitudeSquared

    // Accumulate for spectral centroid
    weightedFrequencySum += frequency * magnitude

    // Accumulate band energies
    if (k >= speechLowBin && k <= speechHighBin) {
      speechBandEnergy += magnitudeSquared
    }
    if (k >= highLowBin && k <= highHighBin) {
      highBandEnergy += magnitudeSquared
    }
  }

  // Calculate total magnitude for centroid normalization
  let totalMagnitude = 0
  for (let k = 0; k < spectrum.length; k++) {
    totalMagnitude += spectrum[k]
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
 * Create initial adaptive VAD state
 */
function createAdaptiveVADState (): AdaptiveVADState {
  return {
    noiseFloor: NOISE_FLOOR_INITIAL,
    noiseFloorSamples: 0,
    recentSpeechHistory: [],
    currentSpeechRate: 0.5, // Start with neutral assumption
    adaptiveSilenceThresholdMs: SILENCE_THRESHOLD_DEFAULT_MS,
    previousFrameSpectrum: null,
    lookAheadBuffer: [],
    lookAheadDurationMs: 0
  }
}

/**
 * Update noise floor estimate based on silence frames
 * Uses exponential moving average during silence periods
 */
function updateNoiseFloor (state: AdaptiveVADState, rms: number, isSpeech: boolean): void {
  if (!isSpeech && rms > 0) {
    // Only update noise floor during silence
    if (state.noiseFloorSamples < 50) {
      // Initial calibration - use simple average
      state.noiseFloor = (state.noiseFloor * state.noiseFloorSamples + rms) / (state.noiseFloorSamples + 1)
      state.noiseFloorSamples++
    } else {
      // Exponential moving average for ongoing adaptation
      state.noiseFloor = state.noiseFloor * (1 - NOISE_FLOOR_ADAPTATION_RATE) + rms * NOISE_FLOOR_ADAPTATION_RATE
    }

    // Clamp noise floor to reasonable range
    state.noiseFloor = Math.max(NOISE_FLOOR_MIN, Math.min(NOISE_FLOOR_MAX, state.noiseFloor))
  }
}

/**
 * Get adaptive VAD threshold based on current noise floor
 */
function getAdaptiveVADThreshold (state: AdaptiveVADState): number {
  const adaptiveThreshold = state.noiseFloor * VAD_MARGIN_ABOVE_NOISE
  // Ensure threshold is within reasonable bounds
  return Math.max(VAD_THRESHOLD_DEFAULT * 0.5, Math.min(VAD_THRESHOLD_DEFAULT * 3, adaptiveThreshold))
}

/**
 * Update speech rate tracking and calculate adaptive silence threshold
 */
function updateSpeechRate (
  state: AdaptiveVADState,
  currentTime: number,
  hasSpeech: boolean,
  frameDurationMs: number
): void {
  // Add current frame to history
  state.recentSpeechHistory.push({ time: currentTime, hasSpeech, durationMs: frameDurationMs })

  // Remove old entries outside the window
  const windowStart = currentTime - SPEECH_RATE_WINDOW_MS
  state.recentSpeechHistory = state.recentSpeechHistory.filter((entry) => entry.time >= windowStart)

  // Calculate speech rate in the window
  let speechMs = 0
  let totalMs = 0
  for (const entry of state.recentSpeechHistory) {
    totalMs += entry.durationMs
    if (entry.hasSpeech) {
      speechMs += entry.durationMs
    }
  }

  state.currentSpeechRate = totalMs > 0 ? speechMs / totalMs : 0.5

  // Adapt silence threshold based on speech rate
  if (state.currentSpeechRate > FAST_SPEECH_THRESHOLD) {
    // Fast speech - use shorter silence threshold
    state.adaptiveSilenceThresholdMs = SILENCE_THRESHOLD_MIN_MS
  } else if (state.currentSpeechRate < SLOW_SPEECH_THRESHOLD) {
    // Slow/thoughtful speech - use longer silence threshold
    state.adaptiveSilenceThresholdMs = SILENCE_THRESHOLD_MAX_MS
  } else {
    // Normal speech - interpolate
    const ratio = (state.currentSpeechRate - SLOW_SPEECH_THRESHOLD) / (FAST_SPEECH_THRESHOLD - SLOW_SPEECH_THRESHOLD)
    state.adaptiveSilenceThresholdMs =
      SILENCE_THRESHOLD_MAX_MS - ratio * (SILENCE_THRESHOLD_MAX_MS - SILENCE_THRESHOLD_MIN_MS)
  }
}

/**
 * Score a potential cut point based on multiple criteria
 * Higher score = better cut point
 */
function scoreCutPoint (lookAheadBuffer: LookAheadFrame[], cutIndex: number, silenceDurationMs: number): number {
  if (cutIndex < 0 || cutIndex >= lookAheadBuffer.length) return 0

  let score = 0
  const frame = lookAheadBuffer[cutIndex]

  // 1. Silence duration score (0-40 points)
  // Longer silence gaps are better cut points
  score += Math.min(40, silenceDurationMs / 5) // Max 40 points at 200ms

  // 2. Energy drop score (0-20 points)
  // Look for frames where energy drops significantly
  if (cutIndex > 0) {
    const prevFrame = lookAheadBuffer[cutIndex - 1]
    const energyDrop = prevFrame.analysis.rms - frame.analysis.rms
    if (energyDrop > 0) {
      score += Math.min(20, energyDrop * 200) // Normalize and cap
    }
  }

  // 3. Low RMS at cut point (0-15 points)
  // Lower energy = better cut point
  const rmsScore = Math.max(0, 15 - frame.analysis.rms * 150)
  score += rmsScore

  // 4. Spectral flux score (0-15 points)
  // Low spectral flux = stable point, good for cutting
  const fluxScore = Math.max(0, 15 - frame.analysis.spectralFlux * 500)
  score += fluxScore

  // 5. Spectral centroid outside speech range (0-10 points)
  // If centroid is outside typical speech range, it's likely a pause
  const centroid = frame.analysis.spectralCentroid
  if (centroid < SPEECH_CENTROID_MIN || centroid > SPEECH_CENTROID_MAX) {
    score += 10
  } else {
    // Penalize cuts in the middle of voiced speech
    score -= 5
  }

  // 6. Position bonus (0-10 points)
  // Prefer cut points that aren't at the very beginning or end of buffer
  const positionRatio = cutIndex / lookAheadBuffer.length
  if (positionRatio > 0.2 && positionRatio < 0.8) {
    score += 10
  } else if (positionRatio > 0.1 && positionRatio < 0.9) {
    score += 5
  }

  return score
}

/**
 * Check if there's a good cut point in the look-ahead buffer
 * Uses multi-criteria scoring to find the optimal cut point
 * Returns the index of the best cut point, or -1 if none found
 */
function findOptimalCutPoint (lookAheadBuffer: LookAheadFrame[], minSilenceMs: number = 50): number {
  if (lookAheadBuffer.length === 0) return -1

  // Collect all potential cut points with their scores
  interface CutPointCandidate {
    index: number
    silenceDurationMs: number
    score: number
  }

  const candidates: CutPointCandidate[] = []
  let currentSilenceStart = -1
  let currentSilenceLength = 0

  for (let i = 0; i < lookAheadBuffer.length; i++) {
    const frame = lookAheadBuffer[i]
    if (!frame.hasSpeech) {
      if (currentSilenceStart === -1) {
        currentSilenceStart = i
      }
      currentSilenceLength += frame.frameEndTime - frame.frameStartTime
    } else {
      if (currentSilenceLength >= minSilenceMs) {
        // Found a silence gap, calculate score
        const score = scoreCutPoint(lookAheadBuffer, currentSilenceStart, currentSilenceLength)
        candidates.push({
          index: currentSilenceStart,
          silenceDurationMs: currentSilenceLength,
          score
        })
      }
      currentSilenceStart = -1
      currentSilenceLength = 0
    }
  }

  // Check final silence run
  if (currentSilenceLength >= minSilenceMs) {
    const score = scoreCutPoint(lookAheadBuffer, currentSilenceStart, currentSilenceLength)
    candidates.push({
      index: currentSilenceStart,
      silenceDurationMs: currentSilenceLength,
      score
    })
  }

  // If no silence gaps found, look for energy dips as fallback
  if (candidates.length === 0) {
    // Find the frame with lowest energy as a last resort
    let minEnergyIndex = -1
    let minEnergy = Infinity

    for (let i = 1; i < lookAheadBuffer.length - 1; i++) {
      const frame = lookAheadBuffer[i]
      // Look for local energy minima
      const prevFrame = lookAheadBuffer[i - 1]
      const nextFrame = lookAheadBuffer[i + 1]

      if (
        frame.analysis.rms < prevFrame.analysis.rms &&
        frame.analysis.rms < nextFrame.analysis.rms &&
        frame.analysis.rms < minEnergy
      ) {
        minEnergy = frame.analysis.rms
        minEnergyIndex = i
      }
    }

    // Only use energy dip if it's significantly lower than average
    if (minEnergyIndex >= 0) {
      let avgRms = 0
      for (const f of lookAheadBuffer) {
        avgRms += f.analysis.rms
      }
      avgRms /= lookAheadBuffer.length

      if (minEnergy < avgRms * 0.5) {
        return minEnergyIndex
      }
    }

    return -1
  }

  // Return the candidate with highest score
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].index
}

/**
 * Convert WAV file to OGG Opus using ffmpeg
 * OGG container with Opus codec is optimal for speech with excellent compression
 * and browser compatibility (pure .opus files don't play in most browsers)
 */
async function convertWavToOggOpus (wavPath: string, oggPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpegPath = ffmpegInstaller.path
    const args = [
      '-i',
      wavPath,
      '-codec:a',
      'libopus',
      '-b:a',
      '16k', // 16 kbps - optimal for 16kHz speech audio
      '-vbr',
      'on', // Variable bitrate for better quality
      '-compression_level',
      '10', // Maximum compression
      '-application',
      'voip', // Optimized for speech
      '-y', // Overwrite output
      oggPath
    ]

    const proc = spawn(ffmpegPath, args)

    let stderr = ''
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    })
  })
}

export class STT implements Stt {
  private isInProgress = false
  private language: string = 'en'

  private readonly trackBySid = new Map<string, RemoteTrack>()
  private readonly streamBySid = new Map<string, AudioStream>()
  private readonly participantBySid = new Map<string, RemoteParticipant>()
  private readonly stoppedSids = new Set<string>() // Track streams that should be terminated

  private readonly sessionBySid = new Map<string, any>()
  private readonly timingBySid = new Map<string, StreamTiming>()
  private readonly chunkStateBySid = new Map<string, ChunkState>()
  private readonly sessionStateBySid = new Map<string, SessionState>() // Full session recording

  private transcriptionCount = 0
  private sessionNumber = 0 // Incremented on each start() for session file naming
  private readonly meetingStartTime: number = Date.now() // Time when the meeting started (object creation)

  private readonly rootDir: string
  private readonly meetingId: string = randomUUID()
  private readonly sampleRate = 16000
  private readonly channels = 1
  private readonly bitsPerSample = 16

  constructor (
    readonly room: Room,
    readonly workspace: string,
    readonly token: string
  ) {
    this.rootDir = join('dumps', sanitizePath(this.workspace), this.meetingId)
  }

  updateLanguage (language: string): void {
    this.language = language
  }

  start (): void {
    if (this.isInProgress) return
    this.isInProgress = true
    this.sessionNumber++

    console.info('Start transcription', {
      workspace: this.workspace,
      room: this.room.name,
      rootDir: this.rootDir,
      sessionNumber: this.sessionNumber,
      meetingStartTime: this.meetingStartTime
    })
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true })
    }

    for (const sid of this.trackBySid.keys()) {
      this.processTrack(sid)
    }
  }

  stop (): void {
    if (!this.isInProgress) return
    console.info('Stopping transcription', { workspace: this.workspace, room: this.room.name })
    this.isInProgress = false
    for (const sid of this.trackBySid.keys()) {
      this.stopWs(sid)
    }
  }

  subscribe (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    console.info('subscribe', {
      kind: track.kind,
      sid: publication.sid,
      name: participant.name,
      identity: participant.identity
    })
    const sid = publication.sid
    if (sid === undefined) return
    if (this.trackBySid.has(sid)) return
    this.trackBySid.set(sid, track)
    this.participantBySid.set(sid, participant)
    if (this.isInProgress) {
      this.processTrack(sid)
    }
  }

  unsubscribe (
    track: RemoteTrack | undefined,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    const sid = publication.sid
    if (sid === undefined) return

    console.info('unsubscribe', {
      kind: track?.kind ?? '',
      sid: publication.sid,
      name: participant.name,
      identity: participant.identity
    })
    this.trackBySid.delete(sid)
    this.participantBySid.delete(sid)
    this.stopWs(sid)
  }

  stopWs (sid: string): void {
    try {
      // Mark this sid as stopped so the streamToFiles loop will exit
      this.stoppedSids.add(sid)

      const stream = this.streamBySid.get(sid)
      if (stream !== undefined) {
        ;(stream as any).close?.()
      }

      // Finalize current chunk if exists
      this.finalizeChunk(sid)

      // Finalize full session recording
      void this.finalizeSession(sid)

      this.streamBySid.delete(sid)
      this.sessionBySid.delete(sid)
      this.timingBySid.delete(sid)
      this.chunkStateBySid.delete(sid)
      this.sessionStateBySid.delete(sid)
    } catch (e) {
      console.error(e)
    }
  }

  /**
   * Flush write buffer to file
   */
  private flushWriteBuffer (chunkState: ChunkState): void {
    if (chunkState.fd !== null && chunkState.writeBufferOffset > 0) {
      writeSync(chunkState.fd, chunkState.writeBuffer, 0, chunkState.writeBufferOffset)
      chunkState.writeBufferOffset = 0
    }
  }

  /**
   * Flush session write buffer to file
   */
  private flushSessionWriteBuffer (sessionState: SessionState): void {
    if (sessionState.fd !== null && sessionState.writeBufferOffset > 0) {
      writeSync(sessionState.fd, sessionState.writeBuffer, 0, sessionState.writeBufferOffset)
      sessionState.writeBufferOffset = 0
    }
  }

  /**
   * Write data to chunk with buffering
   */
  private writeToChunk (chunkState: ChunkState, data: Buffer): void {
    let dataOffset = 0

    while (dataOffset < data.length) {
      const spaceInBuffer = WRITE_BUFFER_SIZE - chunkState.writeBufferOffset
      const bytesToCopy = Math.min(spaceInBuffer, data.length - dataOffset)

      data.copy(chunkState.writeBuffer, chunkState.writeBufferOffset, dataOffset, dataOffset + bytesToCopy)
      chunkState.writeBufferOffset += bytesToCopy
      dataOffset += bytesToCopy

      // Flush buffer when full
      if (chunkState.writeBufferOffset >= WRITE_BUFFER_SIZE) {
        this.flushWriteBuffer(chunkState)
      }
    }

    chunkState.chunkDataLength += data.length
  }

  /**
   * Detect if current frame contains speech based on analysis
   * Uses adaptive thresholds and multi-criteria detection
   */
  private isFrameSpeech (analysis: AudioAnalysis, adaptiveVAD?: AdaptiveVADState): boolean {
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

  /**
   * Write data to full session with buffering
   */
  private writeToSession (sessionState: SessionState, data: Buffer): void {
    let dataOffset = 0

    while (dataOffset < data.length) {
      const spaceInBuffer = WRITE_BUFFER_SIZE - sessionState.writeBufferOffset
      const bytesToCopy = Math.min(spaceInBuffer, data.length - dataOffset)

      data.copy(sessionState.writeBuffer, sessionState.writeBufferOffset, dataOffset, dataOffset + bytesToCopy)
      sessionState.writeBufferOffset += bytesToCopy
      dataOffset += bytesToCopy

      // Flush buffer when full
      if (sessionState.writeBufferOffset >= WRITE_BUFFER_SIZE) {
        this.flushSessionWriteBuffer(sessionState)
      }
    }

    sessionState.dataLength += data.length
  }

  private finalizeChunk (sid: string, endReason: 'silence' | 'max_duration' | 'stream_end' = 'stream_end'): void {
    const chunkState = this.chunkStateBySid.get(sid)
    const timing = this.timingBySid.get(sid)
    const participant = this.participantBySid.get(sid)

    if (chunkState?.fd !== null && chunkState?.fd !== undefined && timing !== undefined) {
      // Skip if chunk is too short (less than minimum duration)
      const chunkDurationMs = chunkState.chunkEndTime - chunkState.chunkStartTime
      if (chunkDurationMs < MIN_CHUNK_DURATION_MS && endReason !== 'stream_end') {
        console.info('Skipping too short chunk', { sid, durationMs: chunkDurationMs, endReason })
        return
      }

      try {
        // Flush any remaining data in write buffer
        this.flushWriteBuffer(chunkState)

        // Update WAV header with correct data length
        updateWavHeader(chunkState.fd, chunkState.chunkDataLength)
        closeSync(chunkState.fd)

        // Calculate metadata using meeting start time (not stream start)
        const startTimeSec = (chunkState.chunkStartTime - this.meetingStartTime) / 1000
        const endTimeSec = (chunkState.chunkEndTime - this.meetingStartTime) / 1000
        const durationSec = endTimeSec - startTimeSec

        const rmsAmplitude =
          chunkState.totalSamples > 0 ? Math.sqrt(chunkState.sumSquares / chunkState.totalSamples) : 0

        const speechRatio = chunkState.totalSamples > 0 ? chunkState.activeSamples / chunkState.totalSamples : 0

        // Note: hasSpeech removed - we always send chunks to transcription
        // The transcription model will determine if there's actual speech

        const metadata: ChunkMetadata = {
          startTimeSec,
          endTimeSec,
          durationSec,
          participant: participant?.identity ?? sid,
          participantName: participant?.name ?? participant?.identity ?? sid,
          sampleRate: this.sampleRate,
          channels: this.channels,
          bitsPerSample: this.bitsPerSample,
          endReason,
          // Informational VAD metrics (for debugging/logging only)
          speechRatio,
          peakAmplitude: chunkState.peakAmplitude,
          rmsAmplitude
        }

        // Read WAV file, compress with gzip, and send to platform
        if (chunkState.chunkFilePath !== null) {
          try {
            const wavData = readFileSync(chunkState.chunkFilePath)
            const gzippedData = gzipSync(wavData, { level: 6 })

            // Send to platform
            void this.sendChunkToPlatform(gzippedData, sid, metadata).catch((e) => {
              console.error('Error sending chunk to platform', { error: e, sid })
            })

            // Clean up local WAV file (skip in debug mode)
            if (!config.Debug) {
              unlinkSync(chunkState.chunkFilePath)
            }

            console.info('Finalized chunk', {
              sid,
              chunkIndex: chunkState.chunkIndex,
              filePath: chunkState.chunkFilePath,
              dataLength: chunkState.chunkDataLength,
              durationMs: chunkDurationMs,
              participant: metadata.participant,
              participantName: metadata.participantName,
              endReason,
              speechRatio: speechRatio.toFixed(2),
              rmsAmplitude: rmsAmplitude.toFixed(4),
              originalSize: wavData.length,
              compressedSize: gzippedData.length,
              compressionRatio: ((1 - gzippedData.length / wavData.length) * 100).toFixed(1) + '%'
            })
          } catch (e) {
            console.error('Error compressing and sending chunk', { error: e, sid })
          }
        }
      } catch (e) {
        console.error('Error finalizing chunk', { error: e, sid })
      }

      // Reset chunk state for next chunk
      chunkState.fd = null
      chunkState.chunkFilePath = null
      chunkState.chunkDataLength = 0
      chunkState.totalSamples = 0
      chunkState.activeSamples = 0
      chunkState.peakAmplitude = 0
      chunkState.sumSquares = 0
      chunkState.writeBufferOffset = 0
      // Reset VAD state
      chunkState.isSpeaking = false
      chunkState.consecutiveSpeechMs = 0
      chunkState.consecutiveSilenceMs = 0
      chunkState.chunkIndex++
    }
  }

  /**
   * Finalize full session recording - convert to Opus and send to platform
   */
  private async finalizeSession (sid: string): Promise<void> {
    const sessionState = this.sessionStateBySid.get(sid)
    const participant = this.participantBySid.get(sid)
    const timing = this.timingBySid.get(sid)

    if (sessionState?.fd === null || sessionState?.fd === undefined) {
      return
    }

    try {
      // Flush remaining buffer
      this.flushSessionWriteBuffer(sessionState)

      // Update WAV header
      updateWavHeader(sessionState.fd, sessionState.dataLength)
      closeSync(sessionState.fd)

      if (sessionState.filePath === null || sessionState.dataLength === 0) {
        console.info('No session data to finalize', { sid })
        return
      }

      const durationSec = timing !== undefined ? (Date.now() - timing.streamStartTime) / 1000 : 0

      // Calculate end time from meeting start
      const startTimeSec = sessionState.startTimeFromMeeting
      const endTimeSec = startTimeSec + durationSec
      const participantIdentity = participant?.identity ?? sid
      const participantName = sanitizePath(participant?.name ?? participant?.identity ?? sid)

      console.info('Finalizing session recording', {
        sid,
        participant: participantIdentity,
        participantName,
        dataLength: sessionState.dataLength,
        startTimeSec: startTimeSec.toFixed(1),
        endTimeSec: endTimeSec.toFixed(1),
        durationSec: durationSec.toFixed(1)
      })

      // Convert WAV to OGG Opus (OGG container for browser compatibility)
      const oggPath = sessionState.filePath.replace('.wav', '.ogg')

      try {
        await convertWavToOggOpus(sessionState.filePath, oggPath)
        console.info('Converted session to OGG Opus', { sid, oggPath })

        // Read OGG and send to platform
        const oggData = readFileSync(oggPath)

        await this.sendSessionToPlatform(
          oggData,
          participantIdentity,
          participantName,
          startTimeSec,
          endTimeSec,
          this.sessionNumber
        )

        // Clean up files (skip in debug mode)
        if (!config.Debug) {
          unlinkSync(sessionState.filePath)
          unlinkSync(oggPath)
        }

        console.info('Session recording sent to platform', {
          sid,
          participant: participantName,
          oggSize: oggData.length,
          durationSec: durationSec.toFixed(1)
        })
      } catch (e) {
        console.error('Error converting/sending session', { error: e, sid })
        // Clean up WAV file on error (skip in debug mode)
        if (!config.Debug) {
          try {
            unlinkSync(sessionState.filePath)
          } catch {}
        }
      }
    } catch (e) {
      console.error('Error finalizing session', { error: e, sid })
    }
  }

  private startNewChunk (sid: string, streamDir: string, startTimeAbs: number): void {
    const chunkState = this.chunkStateBySid.get(sid)
    if (chunkState === undefined) return

    // Calculate relative time in seconds from meeting start
    const startTimeSec = (startTimeAbs - this.meetingStartTime) / 1000

    // Create new chunk file
    const filename = `chunk_${chunkState.chunkIndex}_${startTimeSec.toFixed(1)}.wav`
    const filePath = join(streamDir, filename)

    try {
      // Open file and write placeholder header
      const fd = openSync(filePath, 'w')
      const placeholderHeader = createWavHeader(0, this.sampleRate, this.channels, this.bitsPerSample)
      writeSync(fd, placeholderHeader)

      chunkState.fd = fd
      chunkState.chunkStartTime = startTimeAbs
      chunkState.chunkEndTime = startTimeAbs
      chunkState.chunkDataLength = 0
      chunkState.chunkFilePath = filePath
      chunkState.totalSamples = 0
      chunkState.activeSamples = 0
      chunkState.peakAmplitude = 0
      chunkState.sumSquares = 0
      chunkState.writeBufferOffset = 0
      // Reset VAD state for new chunk
      chunkState.speechStartTime = startTimeAbs
      chunkState.silenceStartTime = 0
      chunkState.consecutiveSpeechMs = 0
      chunkState.consecutiveSilenceMs = 0

      console.info('Started new chunk', {
        sid,
        chunkIndex: chunkState.chunkIndex,
        filePath,
        startTimeSec: startTimeSec.toFixed(1)
      })
    } catch (e) {
      console.error('Error starting new chunk', { error: e, filePath })
    }
  }

  /**
   * Start full session recording for a participant
   */
  private startSession (sid: string, streamDir: string): void {
    const participant = this.participantBySid.get(sid)
    const participantName = sanitizePath(participant?.name ?? participant?.identity ?? sid)
    const filename = `${participantName}_session_${this.sessionNumber}.wav`
    const filePath = join(streamDir, filename)

    // Calculate start time from meeting start
    const now = Date.now()
    const startTimeFromMeeting = (now - this.meetingStartTime) / 1000

    try {
      const fd = openSync(filePath, 'w')
      const placeholderHeader = createWavHeader(0, this.sampleRate, this.channels, this.bitsPerSample)
      writeSync(fd, placeholderHeader)

      const sessionState: SessionState = {
        fd,
        filePath,
        dataLength: 0,
        writeBuffer: Buffer.alloc(WRITE_BUFFER_SIZE),
        writeBufferOffset: 0,
        startTimeFromMeeting,
        frameCount: 0,
        lastFrameHash: 0
      }

      this.sessionStateBySid.set(sid, sessionState)

      console.info('Started session recording', {
        sid,
        filePath,
        participant: participant?.name ?? participant?.identity,
        startTimeFromMeeting: startTimeFromMeeting.toFixed(1)
      })
    } catch (e) {
      console.error('Error starting session', { error: e, filePath })
    }
  }

  processTrack (sid: string): void {
    const track = this.trackBySid.get(sid)
    if (track === undefined) return

    // Don't start if already streaming for this sid
    if (this.streamBySid.has(sid)) {
      console.info('Stream already active for track, skipping', { sid })
      return
    }

    // Clear stopped flag when starting new stream
    this.stoppedSids.delete(sid)

    const stream = new AudioStream(track, 16000)

    const participant = this.participantBySid.get(sid)
    console.info('Starting transcription for track', {
      room: this.room.name,
      sid,
      participant: participant?.name ?? participant?.identity
    })

    this.streamBySid.set(sid, stream)

    void this.streamToFiles(sid, stream).catch((err) => {
      console.error('Failed to stream', { participant: participant?.name ?? participant?.identity ?? sid, error: err })
    })
  }

  async streamToFiles (sid: string, stream: AudioStream): Promise<void> {
    const participant = this.participantBySid.get(sid)
    // Create directory for this stream using participant identity
    const streamDir = join(this.rootDir, sanitizePath(participant?.name ?? participant?.identity ?? sid))
    if (!existsSync(streamDir)) {
      mkdirSync(streamDir, { recursive: true })
    }

    // Initialize timing for this stream
    const streamStartTime = Date.now()
    const timing: StreamTiming = {
      streamStartTime,
      lastFrameEndTime: streamStartTime
    }
    this.timingBySid.set(sid, timing)

    // Initialize chunk state with write buffer and VAD state
    const chunkState: ChunkState = {
      fd: null,
      chunkStartTime: streamStartTime,
      chunkEndTime: streamStartTime,
      chunkDataLength: 0,
      chunkFilePath: null,
      totalSamples: 0,
      activeSamples: 0,
      peakAmplitude: 0,
      sumSquares: 0,
      writeBuffer: Buffer.alloc(WRITE_BUFFER_SIZE),
      writeBufferOffset: 0,
      // VAD state for smart chunking
      isSpeaking: false,
      speechStartTime: 0,
      silenceStartTime: 0,
      lastSpeechEndTime: 0,
      consecutiveSpeechMs: 0,
      consecutiveSilenceMs: 0,
      chunkIndex: 0,
      // Pre-buffer for capturing speech start
      preBuffer: [],
      preBufferDurationMs: 0,
      // Adaptive VAD state
      adaptiveVAD: createAdaptiveVADState()
    }
    this.chunkStateBySid.set(sid, chunkState)

    // Start full session recording
    this.startSession(sid, streamDir)

    console.info('Stream started', {
      sid,
      streamStartTime,
      meetingStartTime: this.meetingStartTime,
      streamDir,
      writeBufferSize: WRITE_BUFFER_SIZE,
      maxChunkDurationMs: MAX_CHUNK_DURATION_MS,
      silenceThresholdMs: `${SILENCE_THRESHOLD_MIN_MS}-${SILENCE_THRESHOLD_MAX_MS} (adaptive)`
    })

    for await (const frame of stream) {
      // Exit loop if this stream was stopped
      if (this.stoppedSids.has(sid)) {
        console.info('Stream stopped, exiting loop', { sid })
        break
      }

      if (!this.isInProgress) continue

      const frameStartTime = timing.lastFrameEndTime
      // Calculate frame duration based on samples: duration_ms = (samples / sampleRate) * 1000
      const frameDurationMs = (frame.samplesPerChannel / this.sampleRate) * 1000
      const frameEndTime = frameStartTime + frameDurationMs

      // Update timing
      timing.lastFrameEndTime = frameEndTime

      // IMPORTANT: Create a proper copy of the buffer, not a view
      // frame.data.buffer may be reused by LiveKit for the next frame
      const buf = Buffer.from(new Uint8Array(frame.data.buffer))

      // Analyze audio for VAD with enhanced metrics
      const analysis = analyzeAudioBuffer(buf, this.sampleRate, chunkState.adaptiveVAD.previousFrameSpectrum)
      const frameHasSpeech = this.isFrameSpeech(analysis, chunkState.adaptiveVAD)

      // Update adaptive VAD state
      updateNoiseFloor(chunkState.adaptiveVAD, analysis.rms, !frameHasSpeech)
      updateSpeechRate(chunkState.adaptiveVAD, frameEndTime, frameHasSpeech, frameDurationMs)

      // Store spectrum for next frame's spectral flux calculation
      if (analysis.spectrum !== null) {
        chunkState.adaptiveVAD.previousFrameSpectrum = analysis.spectrum
      }

      // Track if current frame was written from pre-buffer
      let currentFrameWrittenFromPreBuffer = false

      // Add frame to pre-buffer (ring buffer for capturing speech start)
      // Only add to pre-buffer when not actively recording a chunk
      if (chunkState.fd === null) {
        chunkState.preBuffer.push({
          buf: Buffer.from(buf), // Make a copy
          analysis,
          frameStartTime,
          frameEndTime,
          hasSpeech: frameHasSpeech
        })
        chunkState.preBufferDurationMs += frameDurationMs

        // Trim pre-buffer to keep only recent frames (keep ~200ms to have margin)
        const maxPreBufferMs = SPEECH_START_THRESHOLD_MS * 2
        while (chunkState.preBufferDurationMs > maxPreBufferMs && chunkState.preBuffer.length > 1) {
          const removed = chunkState.preBuffer.shift()
          if (removed !== undefined) {
            chunkState.preBufferDurationMs -= removed.frameEndTime - removed.frameStartTime
          }
        }
      }

      // Update VAD state
      if (frameHasSpeech) {
        // Speech detected
        chunkState.consecutiveSpeechMs += frameDurationMs
        chunkState.consecutiveSilenceMs = 0
        chunkState.lastSpeechEndTime = frameEndTime

        if (!chunkState.isSpeaking && chunkState.consecutiveSpeechMs >= SPEECH_START_THRESHOLD_MS) {
          // Speech started - transition from silence to speaking
          chunkState.isSpeaking = true
          chunkState.speechStartTime = frameStartTime - chunkState.consecutiveSpeechMs

          // Start a new chunk if we don't have one
          if (chunkState.fd === null) {
            this.startNewChunk(sid, streamDir, chunkState.speechStartTime)

            // Write pre-buffered frames that contain speech to capture the beginning
            // Find frames from the start of speech
            const speechStartTime = chunkState.speechStartTime
            for (const preFrame of chunkState.preBuffer) {
              // Include frames that overlap with or come after speech start
              if (preFrame.frameEndTime >= speechStartTime) {
                try {
                  this.writeToChunk(chunkState, preFrame.buf)
                  // Update VAD metrics for pre-buffered frames
                  chunkState.totalSamples += preFrame.analysis.totalSamples
                  chunkState.activeSamples += preFrame.analysis.activeSamples
                  chunkState.sumSquares += preFrame.analysis.sumSquares
                  if (preFrame.analysis.peak > chunkState.peakAmplitude) {
                    chunkState.peakAmplitude = preFrame.analysis.peak
                  }
                  // Check if current frame was in pre-buffer
                  if (preFrame.frameStartTime === frameStartTime) {
                    currentFrameWrittenFromPreBuffer = true
                  }
                } catch (e) {
                  console.error('Error writing pre-buffered frame to chunk', { error: e, sid })
                }
              }
            }
            // Clear pre-buffer after writing
            chunkState.preBuffer = []
            chunkState.preBufferDurationMs = 0
            // Update chunk end time to include pre-buffered data
            chunkState.chunkEndTime = frameEndTime
          }
        }
      } else {
        // Silence detected
        chunkState.consecutiveSilenceMs += frameDurationMs
        chunkState.consecutiveSpeechMs = 0

        if (
          chunkState.isSpeaking &&
          chunkState.consecutiveSilenceMs >= chunkState.adaptiveVAD.adaptiveSilenceThresholdMs
        ) {
          // End of phrase detected - 1 second of silence after speech
          chunkState.isSpeaking = false

          if (chunkState.fd !== null) {
            // Finalize chunk at the point where speech ended (not including trailing silence)
            chunkState.chunkEndTime = chunkState.lastSpeechEndTime
            this.finalizeChunk(sid, 'silence')

            console.info('Phrase ended (silence detected)', {
              sid,
              silenceDurationMs: chunkState.consecutiveSilenceMs,
              adaptiveThresholdMs: chunkState.adaptiveVAD.adaptiveSilenceThresholdMs,
              speechRate: chunkState.adaptiveVAD.currentSpeechRate.toFixed(2),
              noiseFloor: chunkState.adaptiveVAD.noiseFloor.toFixed(4),
              chunkIndex: chunkState.chunkIndex
            })
          }
        }
      }

      // Safety check: if chunk is too long, use look-ahead to find optimal cut point
      if (chunkState.fd !== null) {
        const currentDuration = frameEndTime - chunkState.chunkStartTime

        // Add to look-ahead buffer when approaching max duration
        if (currentDuration >= MAX_CHUNK_DURATION_MS - LOOK_AHEAD_BUFFER_MS) {
          chunkState.adaptiveVAD.lookAheadBuffer.push({
            buf: Buffer.from(buf),
            analysis,
            frameStartTime,
            frameEndTime,
            hasSpeech: frameHasSpeech
          })
          chunkState.adaptiveVAD.lookAheadDurationMs += frameDurationMs
        }

        if (currentDuration >= MAX_CHUNK_DURATION_MS) {
          // Try to find optimal cut point in look-ahead buffer
          const optimalCutIndex = findOptimalCutPoint(chunkState.adaptiveVAD.lookAheadBuffer, 50)

          if (optimalCutIndex >= 0 && optimalCutIndex < chunkState.adaptiveVAD.lookAheadBuffer.length) {
            // Write frames up to cut point, then finalize
            for (let i = 0; i < optimalCutIndex; i++) {
              const laFrame = chunkState.adaptiveVAD.lookAheadBuffer[i]
              this.writeToChunk(chunkState, laFrame.buf)
              chunkState.totalSamples += laFrame.analysis.totalSamples
              chunkState.activeSamples += laFrame.analysis.activeSamples
              chunkState.sumSquares += laFrame.analysis.sumSquares
              if (laFrame.analysis.peak > chunkState.peakAmplitude) {
                chunkState.peakAmplitude = laFrame.analysis.peak
              }
            }
            chunkState.chunkEndTime = chunkState.adaptiveVAD.lookAheadBuffer[optimalCutIndex].frameStartTime
            this.finalizeChunk(sid, 'max_duration')

            console.info('Chunk finalized at optimal cut point', {
              sid,
              durationMs: currentDuration,
              cutPointIndex: optimalCutIndex,
              chunkIndex: chunkState.chunkIndex
            })

            // Start new chunk with remaining frames from look-ahead buffer
            if (chunkState.isSpeaking) {
              const remainingFrames = chunkState.adaptiveVAD.lookAheadBuffer.slice(optimalCutIndex)
              this.startNewChunk(sid, streamDir, remainingFrames[0]?.frameStartTime ?? frameEndTime)

              // Write remaining frames to new chunk
              for (const laFrame of remainingFrames) {
                this.writeToChunk(chunkState, laFrame.buf)
                chunkState.totalSamples += laFrame.analysis.totalSamples
                chunkState.activeSamples += laFrame.analysis.activeSamples
                chunkState.sumSquares += laFrame.analysis.sumSquares
                if (laFrame.analysis.peak > chunkState.peakAmplitude) {
                  chunkState.peakAmplitude = laFrame.analysis.peak
                }
              }
              chunkState.chunkEndTime = frameEndTime
            }
          } else {
            // No good cut point found, cut at current position
            chunkState.chunkEndTime = frameEndTime
            this.finalizeChunk(sid, 'max_duration')

            console.info('Chunk finalized (max duration, no optimal cut)', {
              sid,
              durationMs: currentDuration,
              chunkIndex: chunkState.chunkIndex
            })

            if (chunkState.isSpeaking) {
              this.startNewChunk(sid, streamDir, frameEndTime)
            }
          }

          // Clear look-ahead buffer
          chunkState.adaptiveVAD.lookAheadBuffer = []
          chunkState.adaptiveVAD.lookAheadDurationMs = 0
        }
      }

      // Append audio data to current chunk using buffered write
      // Skip if this frame was already written from pre-buffer
      if (chunkState.fd !== null && !currentFrameWrittenFromPreBuffer) {
        try {
          this.writeToChunk(chunkState, buf)
          chunkState.chunkEndTime = frameEndTime

          // Update VAD metrics
          chunkState.totalSamples += analysis.totalSamples
          chunkState.activeSamples += analysis.activeSamples
          chunkState.sumSquares += analysis.sumSquares
          if (analysis.peak > chunkState.peakAmplitude) {
            chunkState.peakAmplitude = analysis.peak
          }
        } catch (e) {
          console.error('Error writing audio data to chunk', { error: e, sid })
        }
      }

      // Write to full session recording
      const sessionState = this.sessionStateBySid.get(sid)
      if (sessionState?.fd !== null && sessionState !== undefined) {
        try {
          // Calculate simple hash to detect duplicate frames
          let frameHash = 0
          for (let i = 0; i < Math.min(buf.length, 100); i++) {
            frameHash = ((frameHash << 5) - frameHash + buf[i]) | 0
          }
          frameHash = (frameHash + buf.length) | 0

          // Check for potential duplicate
          if (sessionState.lastFrameHash === frameHash && sessionState.frameCount > 0) {
            console.warn('Potential duplicate frame detected in session', {
              sid,
              frameCount: sessionState.frameCount,
              frameHash,
              bufLength: buf.length,
              frameStartTime,
              frameEndTime
            })
          }

          sessionState.lastFrameHash = frameHash
          sessionState.frameCount++

          // Log every 100 frames for debugging
          if (sessionState.frameCount % 100 === 0) {
            console.info('Session write progress', {
              sid,
              frameCount: sessionState.frameCount,
              dataLength: sessionState.dataLength,
              bufLength: buf.length,
              frameStartTime,
              frameEndTime
            })
          }

          this.writeToSession(sessionState, buf)
        } catch (e) {
          console.error('Error writing to session', { error: e, sid })
        }
      }
    }

    // Check if we were stopped externally (via stopWs) or ended naturally
    const wasStopped = this.stoppedSids.has(sid)

    // Only finalize chunk if stream ended naturally (not stopped via stopWs)
    // When stopped via stopWs, finalization is already done there
    if (!wasStopped && chunkState.fd !== null) {
      this.finalizeChunk(sid, 'stream_end')
    }

    // Clean up
    this.stoppedSids.delete(sid)
    this.streamBySid.delete(sid)

    const streamEndTime = Date.now()
    console.info('Stream ended', {
      sid,
      wasStopped,
      streamStartTime: timing.streamStartTime,
      streamEndTime,
      totalDurationMs: streamEndTime - timing.streamStartTime,
      totalChunks: chunkState.chunkIndex + 1
    })
  }

  async sendChunkToPlatform (gzipData: Buffer, sid: string, metadata: ChunkMetadata): Promise<void> {
    try {
      const response = await fetch(`${config.PlatformUrl}/love/send_raw`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: 'Bearer ' + this.token,
          'X-Room-Name': this.room.name ?? '',
          'X-Participant': metadata.participant,
          'X-Participant-Name': metadata.participantName,
          'X-Start-Time': metadata.startTimeSec.toString(),
          'X-End-Time': metadata.endTimeSec.toString(),
          'X-Duration': metadata.durationSec.toString(),
          'X-Sample-Rate': metadata.sampleRate.toString(),
          'X-Channels': metadata.channels.toString(),
          'X-Bits-Per-Sample': metadata.bitsPerSample.toString(),
          'X-End-Reason': metadata.endReason
        },
        body: new Uint8Array(gzipData)
      })

      if (!response.ok) {
        console.error('Failed to send chunk to platform', {
          status: response.status,
          statusText: response.statusText,
          sid
        })
      }
    } catch (e) {
      console.error('Error sending chunk to platform', { error: e, sid })
    }
  }

  /**
   * Send full session Opus audio to platform for attachment
   */
  async sendSessionToPlatform (
    opusData: Buffer,
    participant: string,
    participantName: string,
    startTimeSec: number,
    endTimeSec: number,
    sessionNumber: number
  ): Promise<void> {
    try {
      const response = await fetch(`${config.PlatformUrl}/love/send_session`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'audio/ogg',
          'Content-Length': opusData.length.toString(),
          Authorization: 'Bearer ' + this.token,
          'X-Room-Name': this.room.name ?? '',
          'X-Participant': participant,
          'X-Participant-Name': participantName,
          'X-Start-Time': startTimeSec.toString(),
          'X-End-Time': endTimeSec.toString(),
          'X-Session-Number': sessionNumber.toString()
        },
        body: new Uint8Array(opusData)
      })

      if (!response.ok) {
        console.error('Failed to send session to platform', {
          status: response.status,
          statusText: response.statusText,
          participant
        })
      }
    } catch (e) {
      console.error('Error sending session to platform', { error: e, participant })
    }
  }

  async sendToPlatform (transcript: string, sid: string): Promise<void> {
    const request = {
      transcript,
      participant: this.participantBySid.get(sid)?.identity,
      roomName: this.room.name
    }

    this.transcriptionCount++

    if (this.transcriptionCount === 1 || this.transcriptionCount % 50 === 0) {
      console.log('Sending transcript', this.room.name, this.transcriptionCount)
    }

    try {
      await fetch(`${config.PlatformUrl}/love/transcript`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.token
        },
        body: JSON.stringify(request)
      })
    } catch (e) {
      console.error('Error sending to platform', e)
    }
  }

  close (): void {
    // Finalize all open chunks and sessions
    for (const sid of this.chunkStateBySid.keys()) {
      this.finalizeChunk(sid)
    }
    for (const sid of this.sessionStateBySid.keys()) {
      void this.finalizeSession(sid)
    }
    this.trackBySid.clear()
    this.participantBySid.clear()
    this.chunkStateBySid.clear()
    this.sessionStateBySid.clear()
  }
}
