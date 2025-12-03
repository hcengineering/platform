// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { MeasureContext } from '@hcengineering/core'
import { VadResult } from './types'

/** Default RMS threshold for voice activity detection */
const DEFAULT_VAD_RMS_THRESHOLD = 0.02

/** Default speech ratio threshold */
const DEFAULT_VAD_SPEECH_RATIO_THRESHOLD = 0.1

/** Per-sample threshold for counting active samples */
const SAMPLE_ACTIVITY_THRESHOLD = 0.015

/** WAV header size in bytes */
const WAV_HEADER_SIZE = 44

/**
 * Analyze WAV audio buffer for voice activity
 * Does not trust hasSpeech from metadata, performs independent analysis
 *
 * @param wavBuffer - Complete WAV file buffer (with header)
 * @param rmsThreshold - RMS threshold for speech detection (default: 0.02)
 * @param speechRatioThreshold - Minimum ratio of active samples (default: 0.1)
 * @returns VAD analysis result
 */
export function analyzeAudio (
  ctx: MeasureContext,
  wavBuffer: Buffer,
  rmsThreshold: number = DEFAULT_VAD_RMS_THRESHOLD,
  speechRatioThreshold: number = DEFAULT_VAD_SPEECH_RATIO_THRESHOLD
): VadResult {
  // Skip WAV header (44 bytes for standard PCM WAV)
  if (wavBuffer.length <= WAV_HEADER_SIZE) {
    return {
      hasSpeech: false,
      speechRatio: 0,
      rmsAmplitude: 0,
      peakAmplitude: 0
    }
  }

  const audioData = wavBuffer.subarray(WAV_HEADER_SIZE)

  // Analyze 16-bit PCM samples (2 bytes per sample)
  const sampleCount = Math.floor(audioData.length / 2)

  if (sampleCount === 0) {
    return {
      hasSpeech: false,
      speechRatio: 0,
      rmsAmplitude: 0,
      peakAmplitude: 0
    }
  }

  let sumSquares = 0
  let peakAmplitude = 0
  let activeSamples = 0

  ctx.withSync('analyzeAudio', {}, () => {
    for (let i = 0; i < audioData.length - 1; i += 2) {
      // Read 16-bit signed sample (little-endian)
      const sample = audioData.readInt16LE(i)

      // Normalize to 0-1 range (16-bit audio range is -32768 to 32767)
      const normalized = Math.abs(sample) / 32768

      // Accumulate for RMS calculation
      sumSquares += normalized * normalized

      // Track peak amplitude
      if (normalized > peakAmplitude) {
        peakAmplitude = normalized
      }

      // Count samples above activity threshold
      if (normalized > SAMPLE_ACTIVITY_THRESHOLD) {
        activeSamples++
      }
    }
  })

  // Calculate RMS amplitude
  const rmsAmplitude = Math.sqrt(sumSquares / sampleCount)

  // Calculate speech ratio
  const speechRatio = activeSamples / sampleCount

  // Determine if speech is present using multiple criteria
  const hasSpeech = rmsAmplitude > rmsThreshold || speechRatio > speechRatioThreshold

  return {
    hasSpeech,
    speechRatio,
    rmsAmplitude,
    peakAmplitude
  }
}

/**
 * Parse WAV header to extract audio parameters
 * Useful for validation and logging
 *
 * @param wavBuffer - WAV file buffer
 * @returns Parsed WAV parameters or undefined if invalid
 */
export function parseWavHeader (wavBuffer: Buffer):
| {
  sampleRate: number
  channels: number
  bitsPerSample: number
  dataSize: number
}
| undefined {
  if (wavBuffer.length < WAV_HEADER_SIZE) {
    return undefined
  }

  // Validate RIFF header
  const riff = wavBuffer.toString('ascii', 0, 4)
  const wave = wavBuffer.toString('ascii', 8, 12)

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return undefined
  }

  // Read format chunk
  const channels = wavBuffer.readUInt16LE(22)
  const sampleRate = wavBuffer.readUInt32LE(24)
  const bitsPerSample = wavBuffer.readUInt16LE(34)
  const dataSize = wavBuffer.readUInt32LE(40)

  return {
    sampleRate,
    channels,
    bitsPerSample,
    dataSize
  }
}

/**
 * Calculate audio duration from WAV buffer
 *
 * @param wavBuffer - WAV file buffer
 * @returns Duration in seconds, or 0 if unable to parse
 */
export function getAudioDuration (wavBuffer: Buffer): number {
  const header = parseWavHeader(wavBuffer)

  if (header === undefined) {
    return 0
  }

  const bytesPerSample = header.bitsPerSample / 8
  const bytesPerSecond = header.sampleRate * header.channels * bytesPerSample

  if (bytesPerSecond === 0) {
    return 0
  }

  return header.dataSize / bytesPerSecond
}
