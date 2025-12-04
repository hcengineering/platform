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

import {
  createAdaptiveVADState,
  updateNoiseFloor,
  updateSpeechRate,
  scoreCutPoint,
  findOptimalCutPoint,
  addToLookAheadBuffer,
  removeFromLookAheadBuffer,
  clearLookAheadBuffer,
  getLookAheadDuration
} from '../stream/chunk-detection'

import {
  type LookAheadFrame,
  type AudioAnalysis,
  NOISE_FLOOR_INITIAL,
  SILENCE_THRESHOLD_DEFAULT_MS,
  SILENCE_THRESHOLD_MIN_MS,
  SILENCE_THRESHOLD_MAX_MS,
  NOISE_FLOOR_MIN,
  NOISE_FLOOR_MAX
} from '../stream/types'

/**
 * Create a mock AudioAnalysis object
 */
function createMockAnalysis (overrides: Partial<AudioAnalysis> = {}): AudioAnalysis {
  return {
    rms: 0.02,
    peak: 0.05,
    activeSamples: 50,
    totalSamples: 320,
    sumSquares: 0.02,
    zeroCrossingRate: 0.15,
    lowBandEnergy: 0.5,
    highBandEnergy: 0.2,
    spectralCentroid: 1200,
    spectralFlux: 0.01,
    spectrum: null,
    ...overrides
  }
}

/**
 * Create a mock LookAheadFrame
 */
function createMockFrame (
  frameStartTime: number,
  frameEndTime: number,
  hasSpeech: boolean,
  analysisOverrides: Partial<AudioAnalysis> = {}
): LookAheadFrame {
  return {
    buf: Buffer.alloc(640), // 20ms at 16kHz, 16-bit
    analysis: createMockAnalysis(analysisOverrides),
    frameStartTime,
    frameEndTime,
    hasSpeech
  }
}

describe('Chunk Detection', () => {
  describe('createAdaptiveVADState', () => {
    it('should create state with default values', () => {
      const state = createAdaptiveVADState()

      expect(state.noiseFloor).toBe(NOISE_FLOOR_INITIAL)
      expect(state.noiseFloorSamples).toBe(0)
      expect(state.recentSpeechHistory).toEqual([])
      expect(state.currentSpeechRate).toBe(0.5)
      expect(state.adaptiveSilenceThresholdMs).toBe(SILENCE_THRESHOLD_DEFAULT_MS)
      expect(state.previousFrameSpectrum).toBeNull()
      expect(state.lookAheadBuffer).toEqual([])
      expect(state.lookAheadDurationMs).toBe(0)
    })

    it('should create independent state objects', () => {
      const state1 = createAdaptiveVADState()
      const state2 = createAdaptiveVADState()

      state1.noiseFloor = 0.05
      state1.recentSpeechHistory.push({ time: 1000, hasSpeech: true, durationMs: 20 })

      expect(state2.noiseFloor).toBe(NOISE_FLOOR_INITIAL)
      expect(state2.recentSpeechHistory).toEqual([])
    })
  })

  describe('updateNoiseFloor', () => {
    it('should update noise floor during silence', () => {
      const state = createAdaptiveVADState()
      const initialFloor = state.noiseFloor

      // Simulate silence with low RMS
      updateNoiseFloor(state, 0.008, false)

      expect(state.noiseFloor).not.toBe(initialFloor)
      expect(state.noiseFloorSamples).toBe(1)
    })

    it('should not update noise floor during speech', () => {
      const state = createAdaptiveVADState()
      const initialFloor = state.noiseFloor

      updateNoiseFloor(state, 0.05, true)

      expect(state.noiseFloor).toBe(initialFloor)
      expect(state.noiseFloorSamples).toBe(0)
    })

    it('should use simple average during calibration (first 50 samples)', () => {
      const state = createAdaptiveVADState()

      // Add samples during calibration phase
      for (let i = 0; i < 10; i++) {
        updateNoiseFloor(state, 0.02, false)
      }

      expect(state.noiseFloorSamples).toBe(10)
      // Should be closer to 0.02 than initial value
      expect(state.noiseFloor).toBeGreaterThan(NOISE_FLOOR_INITIAL)
    })

    it('should use exponential moving average after calibration', () => {
      const state = createAdaptiveVADState()
      state.noiseFloorSamples = 50
      state.noiseFloor = 0.01

      // Update with higher value
      updateNoiseFloor(state, 0.05, false)

      // Should adapt slowly (5% rate)
      expect(state.noiseFloor).toBeGreaterThan(0.01)
      expect(state.noiseFloor).toBeLessThan(0.02) // Much less than 0.05
    })

    it('should clamp noise floor to minimum', () => {
      const state = createAdaptiveVADState()
      state.noiseFloorSamples = 50
      state.noiseFloor = 0.01

      // Try to set very low
      updateNoiseFloor(state, 0.0001, false)

      expect(state.noiseFloor).toBeGreaterThanOrEqual(NOISE_FLOOR_MIN)
    })

    it('should clamp noise floor to maximum', () => {
      const state = createAdaptiveVADState()
      state.noiseFloorSamples = 50
      state.noiseFloor = 0.08

      // Try to set very high
      updateNoiseFloor(state, 0.5, false)

      expect(state.noiseFloor).toBeLessThanOrEqual(NOISE_FLOOR_MAX)
    })

    it('should not update with zero RMS', () => {
      const state = createAdaptiveVADState()
      const initialFloor = state.noiseFloor

      updateNoiseFloor(state, 0, false)

      expect(state.noiseFloor).toBe(initialFloor)
    })
  })

  describe('updateSpeechRate', () => {
    it('should add frame to speech history', () => {
      const state = createAdaptiveVADState()

      updateSpeechRate(state, 1000, true, 20)

      expect(state.recentSpeechHistory.length).toBe(1)
      expect(state.recentSpeechHistory[0]).toEqual({
        time: 1000,
        hasSpeech: true,
        durationMs: 20
      })
    })

    it('should remove old entries outside window', () => {
      const state = createAdaptiveVADState()

      // Add old entry
      state.recentSpeechHistory.push({ time: 1000, hasSpeech: true, durationMs: 20 })

      // Add new entry way in the future (>5000ms window)
      updateSpeechRate(state, 10000, true, 20)

      expect(state.recentSpeechHistory.length).toBe(1)
      expect(state.recentSpeechHistory[0].time).toBe(10000)
    })

    it('should calculate speech rate correctly', () => {
      const state = createAdaptiveVADState()

      // Add 5 speech frames and 5 silence frames
      for (let i = 0; i < 10; i++) {
        updateSpeechRate(state, 1000 + i * 20, i < 5, 20)
      }

      expect(state.currentSpeechRate).toBeCloseTo(0.5, 1)
    })

    it('should set short silence threshold for fast speech', () => {
      const state = createAdaptiveVADState()

      // Simulate fast speech (>70% speech rate)
      for (let i = 0; i < 100; i++) {
        updateSpeechRate(state, 1000 + i * 20, i % 10 < 8, 20) // 80% speech
      }

      expect(state.adaptiveSilenceThresholdMs).toBe(SILENCE_THRESHOLD_MIN_MS)
    })

    it('should set long silence threshold for slow speech', () => {
      const state = createAdaptiveVADState()

      // Simulate slow speech (<30% speech rate)
      for (let i = 0; i < 100; i++) {
        updateSpeechRate(state, 1000 + i * 20, i % 10 < 2, 20) // 20% speech
      }

      expect(state.adaptiveSilenceThresholdMs).toBe(SILENCE_THRESHOLD_MAX_MS)
    })

    it('should interpolate for normal speech rate', () => {
      const state = createAdaptiveVADState()

      // Simulate normal speech (~50% speech rate)
      for (let i = 0; i < 100; i++) {
        updateSpeechRate(state, 1000 + i * 20, i % 2 === 0, 20) // 50% speech
      }

      expect(state.adaptiveSilenceThresholdMs).toBeGreaterThan(SILENCE_THRESHOLD_MIN_MS)
      expect(state.adaptiveSilenceThresholdMs).toBeLessThan(SILENCE_THRESHOLD_MAX_MS)
    })
  })

  describe('scoreCutPoint', () => {
    it('should return 0 for invalid indices', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true)
      ]

      expect(scoreCutPoint(buffer, -1, 100)).toBe(0)
      expect(scoreCutPoint(buffer, 5, 100)).toBe(0)
    })

    it('should give higher score for longer silence', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, false, { rms: 0.005 }),
        createMockFrame(20, 40, false, { rms: 0.005 })
      ]

      const score100 = scoreCutPoint(buffer, 0, 100)
      const score200 = scoreCutPoint(buffer, 0, 200)

      expect(score200).toBeGreaterThan(score100)
    })

    it('should give higher score for lower RMS', () => {
      const lowRmsBuffer: LookAheadFrame[] = [
        createMockFrame(0, 20, false, { rms: 0.001 })
      ]
      const highRmsBuffer: LookAheadFrame[] = [
        createMockFrame(0, 20, false, { rms: 0.1 })
      ]

      const lowRmsScore = scoreCutPoint(lowRmsBuffer, 0, 100)
      const highRmsScore = scoreCutPoint(highRmsBuffer, 0, 100)

      expect(lowRmsScore).toBeGreaterThan(highRmsScore)
    })

    it('should give bonus for energy drop', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.1 }),
        createMockFrame(20, 40, false, { rms: 0.01 }) // Big energy drop
      ]

      const score = scoreCutPoint(buffer, 1, 100)

      // Should include energy drop bonus
      expect(score).toBeGreaterThan(20) // Base silence score + energy drop
    })

    it('should give bonus for centroid outside speech range', () => {
      const outsideRange: LookAheadFrame[] = [
        createMockFrame(0, 20, false, { spectralCentroid: 100 }) // Below 400 Hz
      ]
      const insideRange: LookAheadFrame[] = [
        createMockFrame(0, 20, false, { spectralCentroid: 1500 }) // In speech range
      ]

      const outsideScore = scoreCutPoint(outsideRange, 0, 100)
      const insideScore = scoreCutPoint(insideRange, 0, 100)

      expect(outsideScore).toBeGreaterThan(insideScore)
    })

    it('should give position bonus for middle positions', () => {
      const buffer: LookAheadFrame[] = []
      for (let i = 0; i < 10; i++) {
        buffer.push(createMockFrame(i * 20, (i + 1) * 20, false, { rms: 0.005 }))
      }

      const edgeScore = scoreCutPoint(buffer, 0, 100) // Position ratio = 0
      const middleScore = scoreCutPoint(buffer, 5, 100) // Position ratio = 0.5

      expect(middleScore).toBeGreaterThan(edgeScore)
    })
  })

  describe('findOptimalCutPoint', () => {
    it('should return -1 for empty buffer', () => {
      expect(findOptimalCutPoint([])).toBe(-1)
    })

    it('should find silence gap', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.05 }),
        createMockFrame(20, 40, true, { rms: 0.05 }),
        createMockFrame(40, 60, false, { rms: 0.005 }), // Silence starts
        createMockFrame(60, 80, false, { rms: 0.005 }),
        createMockFrame(80, 100, false, { rms: 0.005 }),
        createMockFrame(100, 120, true, { rms: 0.05 })
      ]

      const cutIndex = findOptimalCutPoint(buffer, 50)

      // Should find the silence gap starting at index 2
      expect(cutIndex).toBe(2)
    })

    it('should prefer longer silence gaps', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.05 }),
        createMockFrame(20, 40, false, { rms: 0.005 }), // Short silence (20ms)
        createMockFrame(40, 60, true, { rms: 0.05 }),
        createMockFrame(60, 80, false, { rms: 0.005 }), // Long silence (60ms)
        createMockFrame(80, 100, false, { rms: 0.005 }),
        createMockFrame(100, 120, false, { rms: 0.005 }),
        createMockFrame(120, 140, true, { rms: 0.05 })
      ]

      const cutIndex = findOptimalCutPoint(buffer, 20)

      // Should prefer the longer silence gap at index 3
      expect(cutIndex).toBe(3)
    })

    it('should return -1 if no silence gap meets minimum', () => {
      // All frames have high, consistent energy - no silence and no local minima
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.1 }),
        createMockFrame(20, 40, true, { rms: 0.1 }),
        createMockFrame(40, 60, true, { rms: 0.1 }),
        createMockFrame(60, 80, true, { rms: 0.1 })
      ]

      const cutIndex = findOptimalCutPoint(buffer, 100) // Require 100ms silence

      // No silence gaps and no significant energy dips, should return -1
      expect(cutIndex).toBe(-1)
    })

    it('should find energy dip as fallback', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.1 }),
        createMockFrame(20, 40, true, { rms: 0.08 }),
        createMockFrame(40, 60, true, { rms: 0.02 }), // Local minimum
        createMockFrame(60, 80, true, { rms: 0.07 }),
        createMockFrame(80, 100, true, { rms: 0.1 })
      ]

      const cutIndex = findOptimalCutPoint(buffer, 1000) // High threshold to force fallback

      // Should find the energy dip at index 2
      expect(cutIndex).toBe(2)
    })

    it('should handle all-speech buffer gracefully', () => {
      const buffer: LookAheadFrame[] = []
      for (let i = 0; i < 5; i++) {
        buffer.push(createMockFrame(i * 20, (i + 1) * 20, true, { rms: 0.1 }))
      }

      const cutIndex = findOptimalCutPoint(buffer, 100)

      // Should return -1 if no good cut point found
      expect(cutIndex).toBe(-1)
    })

    it('should handle silence at end of buffer', () => {
      const buffer: LookAheadFrame[] = [
        createMockFrame(0, 20, true, { rms: 0.05 }),
        createMockFrame(20, 40, true, { rms: 0.05 }),
        createMockFrame(40, 60, false, { rms: 0.005 }),
        createMockFrame(60, 80, false, { rms: 0.005 }),
        createMockFrame(80, 100, false, { rms: 0.005 })
      ]

      const cutIndex = findOptimalCutPoint(buffer, 50)

      // Should find silence gap at the end
      expect(cutIndex).toBe(2)
    })
  })

  describe('Look-ahead buffer management', () => {
    describe('addToLookAheadBuffer', () => {
      it('should add frame to buffer', () => {
        const state = createAdaptiveVADState()
        const frame = createMockFrame(0, 20, true)

        addToLookAheadBuffer(state, frame)

        expect(state.lookAheadBuffer.length).toBe(1)
        expect(state.lookAheadBuffer[0]).toBe(frame)
      })

      it('should update duration', () => {
        const state = createAdaptiveVADState()

        addToLookAheadBuffer(state, createMockFrame(0, 20, true))
        addToLookAheadBuffer(state, createMockFrame(20, 40, true))

        expect(state.lookAheadDurationMs).toBe(40)
      })
    })

    describe('removeFromLookAheadBuffer', () => {
      it('should remove frames from beginning', () => {
        const state = createAdaptiveVADState()
        const frame1 = createMockFrame(0, 20, true)
        const frame2 = createMockFrame(20, 40, true)
        const frame3 = createMockFrame(40, 60, true)

        state.lookAheadBuffer = [frame1, frame2, frame3]
        state.lookAheadDurationMs = 60

        const removed = removeFromLookAheadBuffer(state, 2)

        expect(removed).toEqual([frame1, frame2])
        expect(state.lookAheadBuffer).toEqual([frame3])
        expect(state.lookAheadDurationMs).toBe(20)
      })

      it('should handle removing all frames', () => {
        const state = createAdaptiveVADState()
        state.lookAheadBuffer = [
          createMockFrame(0, 20, true),
          createMockFrame(20, 40, true)
        ]
        state.lookAheadDurationMs = 40

        removeFromLookAheadBuffer(state, 5)

        expect(state.lookAheadBuffer.length).toBe(0)
        expect(state.lookAheadDurationMs).toBe(0)
      })
    })

    describe('clearLookAheadBuffer', () => {
      it('should clear buffer and reset duration', () => {
        const state = createAdaptiveVADState()
        state.lookAheadBuffer = [
          createMockFrame(0, 20, true),
          createMockFrame(20, 40, true)
        ]
        state.lookAheadDurationMs = 40

        clearLookAheadBuffer(state)

        expect(state.lookAheadBuffer).toEqual([])
        expect(state.lookAheadDurationMs).toBe(0)
      })
    })

    describe('getLookAheadDuration', () => {
      it('should return current duration', () => {
        const state = createAdaptiveVADState()
        state.lookAheadDurationMs = 150

        expect(getLookAheadDuration(state)).toBe(150)
      })
    })
  })

  describe('Integration tests', () => {
    it('should simulate realistic speech pattern', () => {
      const state = createAdaptiveVADState()

      // Simulate speech with pauses
      const frameTimes = [
        // Speech burst
        { time: 0, speech: true, rms: 0.05 },
        { time: 20, speech: true, rms: 0.06 },
        { time: 40, speech: true, rms: 0.04 },
        // Pause
        { time: 60, speech: false, rms: 0.005 },
        { time: 80, speech: false, rms: 0.005 },
        { time: 100, speech: false, rms: 0.004 },
        // Speech continues
        { time: 120, speech: true, rms: 0.05 },
        { time: 140, speech: true, rms: 0.07 }
      ]

      for (const ft of frameTimes) {
        updateSpeechRate(state, ft.time, ft.speech, 20)
        updateNoiseFloor(state, ft.rms, ft.speech)

        if (ft.time >= 60) {
          addToLookAheadBuffer(state, createMockFrame(
            ft.time,
            ft.time + 20,
            ft.speech,
            { rms: ft.rms }
          ))
        }
      }

      // Find cut point at pause
      const cutIndex = findOptimalCutPoint(state.lookAheadBuffer, 40)

      // Should find the silence gap
      expect(cutIndex).toBeGreaterThanOrEqual(0)

      // Noise floor should have adapted to silence level
      expect(state.noiseFloor).toBeLessThan(0.02)
    })

    it('should handle rapid speech correctly', () => {
      const state = createAdaptiveVADState()

      // Simulate rapid speech (mostly speech, short pauses)
      for (let i = 0; i < 250; i++) {
        // 90% speech
        const hasSpeech = i % 10 !== 0
        updateSpeechRate(state, i * 20, hasSpeech, 20)
      }

      // Should have adapted to fast speech threshold
      expect(state.adaptiveSilenceThresholdMs).toBe(SILENCE_THRESHOLD_MIN_MS)
    })
  })
})
