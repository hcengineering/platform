// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { MeasureContext } from '@hcengineering/core'
import {
  WAV_HEADER_SIZE,
  parseWavHeader as parseWavHeaderDsp,
  extractWavSamples,
  calculateRms,
  calculatePeak,
  getWavDuration
} from '@hcengineering/audio-dsp'
import { VadResult } from './types'

/** Default RMS threshold for voice activity detection */
const DEFAULT_VAD_RMS_THRESHOLD = 0.02

/** Default speech ratio threshold */
const DEFAULT_VAD_SPEECH_RATIO_THRESHOLD = 0.1

/** Per-sample threshold for counting active samples (in Int16 scale) */
const SAMPLE_ACTIVITY_THRESHOLD_INT16 = Math.round(0.015 * 32768)

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

  // Extract samples using audio-dsp library (returns Int16Array)
  const samples = extractWavSamples(wavBuffer)

  if (samples === undefined || samples.length === 0) {
    return {
      hasSpeech: false,
      speechRatio: 0,
      rmsAmplitude: 0,
      peakAmplitude: 0
    }
  }

  let activeSamples = 0

  ctx.withSync('analyzeAudio', {}, () => {
    // Count active samples - work directly with Int16 values to avoid conversion
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > SAMPLE_ACTIVITY_THRESHOLD_INT16) {
        activeSamples++
      }
    }
  })

  // Use audio-dsp library for RMS and peak calculations
  // These functions handle Int16Array internally, no conversion needed
  const rmsAmplitude = calculateRms(samples)
  const peakAmplitude = calculatePeak(samples)

  // Calculate speech ratio
  const speechRatio = activeSamples / samples.length

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
  // Use audio-dsp library for WAV header parsing
  const header = parseWavHeaderDsp(wavBuffer)

  if (header === undefined) {
    return undefined
  }

  return {
    sampleRate: header.sampleRate,
    channels: header.channels,
    bitsPerSample: header.bitsPerSample,
    dataSize: header.dataSize
  }
}

/**
 * Calculate audio duration from WAV buffer
 *
 * @param wavBuffer - WAV file buffer
 * @returns Duration in seconds, or 0 if unable to parse
 */
export function getAudioDuration (wavBuffer: Buffer): number {
  // Use audio-dsp library for duration calculation
  return getWavDuration(wavBuffer)
}
