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
 * Chunk detection and boundary finding logic
 * Provides functions for finding optimal cut points in audio streams
 * based on silence detection, energy analysis, and speech patterns
 */

import {
  type LookAheadFrame,
  type AdaptiveVADState,
  type CutPointCandidate,
  NOISE_FLOOR_ADAPTATION_RATE,
  NOISE_FLOOR_MIN,
  NOISE_FLOOR_MAX,
  NOISE_FLOOR_INITIAL,
  SILENCE_THRESHOLD_DEFAULT_MS,
  SILENCE_THRESHOLD_MIN_MS,
  SILENCE_THRESHOLD_MAX_MS,
  SPEECH_RATE_WINDOW_MS,
  FAST_SPEECH_THRESHOLD,
  SLOW_SPEECH_THRESHOLD,
  SPEECH_CENTROID_MIN,
  SPEECH_CENTROID_MAX
} from './types.js'

/**
 * Create initial adaptive VAD state
 *
 * @returns Fresh adaptive VAD state with default values
 */
export function createAdaptiveVADState (): AdaptiveVADState {
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
 *
 * @param state - Adaptive VAD state to update
 * @param rms - RMS value of current frame
 * @param isSpeech - Whether current frame contains speech
 */
export function updateNoiseFloor (state: AdaptiveVADState, rms: number, isSpeech: boolean): void {
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
 * Update speech rate tracking and calculate adaptive silence threshold
 *
 * @param state - Adaptive VAD state to update
 * @param currentTime - Current timestamp in ms
 * @param hasSpeech - Whether current frame contains speech
 * @param frameDurationMs - Duration of current frame in ms
 */
export function updateSpeechRate (
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
 *
 * @param lookAheadBuffer - Buffer of look-ahead frames
 * @param cutIndex - Index of potential cut point
 * @param silenceDurationMs - Duration of silence at this point
 * @returns Score for the cut point (higher is better)
 */
export function scoreCutPoint (
  lookAheadBuffer: LookAheadFrame[],
  cutIndex: number,
  silenceDurationMs: number
): number {
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
 *
 * @param lookAheadBuffer - Buffer of look-ahead frames
 * @param minSilenceMs - Minimum silence duration to consider (default: 50ms)
 * @returns Index of the best cut point, or -1 if none found
 */
export function findOptimalCutPoint (lookAheadBuffer: LookAheadFrame[], minSilenceMs: number = 50): number {
  if (lookAheadBuffer.length === 0) return -1

  // Collect all potential cut points with their scores
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
 * Add frame to look-ahead buffer
 *
 * @param state - Adaptive VAD state
 * @param frame - Frame to add
 */
export function addToLookAheadBuffer (state: AdaptiveVADState, frame: LookAheadFrame): void {
  state.lookAheadBuffer.push(frame)
  state.lookAheadDurationMs += frame.frameEndTime - frame.frameStartTime
}

/**
 * Remove frames from the beginning of look-ahead buffer
 *
 * @param state - Adaptive VAD state
 * @param count - Number of frames to remove
 * @returns Removed frames
 */
export function removeFromLookAheadBuffer (state: AdaptiveVADState, count: number): LookAheadFrame[] {
  const removed = state.lookAheadBuffer.splice(0, count)
  for (const frame of removed) {
    state.lookAheadDurationMs -= frame.frameEndTime - frame.frameStartTime
  }
  return removed
}

/**
 * Clear look-ahead buffer
 *
 * @param state - Adaptive VAD state
 */
export function clearLookAheadBuffer (state: AdaptiveVADState): void {
  state.lookAheadBuffer = []
  state.lookAheadDurationMs = 0
}

/**
 * Get current look-ahead buffer duration
 *
 * @param state - Adaptive VAD state
 * @returns Duration in milliseconds
 */
export function getLookAheadDuration (state: AdaptiveVADState): number {
  return state.lookAheadDurationMs
}
