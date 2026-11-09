//
// Copyright © 2026 Hardcore Engineering Inc.
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
//

import { GRACE_PERIOD_MS } from '@hcengineering/billing'
import { type UsageStatus } from '@hcengineering/core'

import { computeRestrictionState, isFeatureRestricted, OK_RESTRICTION_STATE } from '../stores/restrictionLogic'

function makeUsage (limitsExceededSince?: number): UsageStatus {
  return {
    usage: { storageBytes: 0, livekitTrafficBytes: 0 },
    startTime: 0,
    updateTime: 0,
    limitsExceededSince
  }
}

describe('computeRestrictionState', () => {
  const now = 1_700_000_000_000

  it('returns ok when usageInfo is missing', () => {
    expect(computeRestrictionState({ usageInfo: undefined }, now)).toBe(OK_RESTRICTION_STATE)
  })

  it('returns ok when limitsExceededSince is undefined', () => {
    expect(computeRestrictionState({ usageInfo: makeUsage(undefined) }, now)).toBe(OK_RESTRICTION_STATE)
  })

  it('returns warning while inside the grace period', () => {
    const exceededAt = now - 1000 // 1s ago
    const state = computeRestrictionState({ usageInfo: makeUsage(exceededAt) }, now)
    expect(state.mode).toBe('warning')
    expect(state.gracePeriodEndsAt).toBe(exceededAt + GRACE_PERIOD_MS)
    expect(state.restrictedFeatures.size).toBe(0)
  })

  it('returns warning at the very start of the grace period', () => {
    const state = computeRestrictionState({ usageInfo: makeUsage(now) }, now)
    expect(state.mode).toBe('warning')
  })

  it('flips to restricted exactly at the boundary', () => {
    const exceededAt = now - GRACE_PERIOD_MS
    const state = computeRestrictionState({ usageInfo: makeUsage(exceededAt) }, now)
    expect(state.mode).toBe('restricted')
    expect(isFeatureRestricted('fileUpload', state)).toBe(true)
  })

  it('returns restricted past the grace period', () => {
    const exceededAt = now - GRACE_PERIOD_MS - 60_000
    const state = computeRestrictionState({ usageInfo: makeUsage(exceededAt) }, now)
    expect(state.mode).toBe('restricted')
    expect(isFeatureRestricted('fileUpload', state)).toBe(true)
  })

  it('uses the supplied custom grace period', () => {
    const exceededAt = now - 100
    const customGrace = 50
    const state = computeRestrictionState({ usageInfo: makeUsage(exceededAt) }, now, customGrace)
    expect(state.mode).toBe('restricted')
    expect(state.gracePeriodEndsAt).toBe(exceededAt + customGrace)
  })

  it('treats input == undefined as ok', () => {
    expect(computeRestrictionState(undefined, now)).toBe(OK_RESTRICTION_STATE)
  })
})

describe('isFeatureRestricted', () => {
  it('returns false for ok state', () => {
    expect(isFeatureRestricted('fileUpload', OK_RESTRICTION_STATE)).toBe(false)
  })
})
