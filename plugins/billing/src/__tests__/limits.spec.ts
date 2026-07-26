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

import { DEFAULT_TIER_LIMITS_GB, TIER_LIMITS_GB, getTierLimitsBytes, getTierLimitsGB } from '../limits'

describe('getTierLimitsGB', () => {
  it('returns the configured limits per known plan', () => {
    expect(getTierLimitsGB('common')).toEqual(TIER_LIMITS_GB.common)
    expect(getTierLimitsGB('rare')).toEqual(TIER_LIMITS_GB.rare)
    expect(getTierLimitsGB('epic')).toEqual(TIER_LIMITS_GB.epic)
    expect(getTierLimitsGB('legendary')).toEqual(TIER_LIMITS_GB.legendary)
  })

  it('falls back to default tier for unknown plan', () => {
    expect(getTierLimitsGB('mystery')).toEqual(DEFAULT_TIER_LIMITS_GB)
  })

  it('falls back to default tier when plan is undefined', () => {
    expect(getTierLimitsGB(undefined)).toEqual(DEFAULT_TIER_LIMITS_GB)
  })

  it('matches plan name case-insensitively', () => {
    expect(getTierLimitsGB('RARE')).toEqual(TIER_LIMITS_GB.rare)
    expect(getTierLimitsGB('Epic')).toEqual(TIER_LIMITS_GB.epic)
  })
})

describe('getTierLimitsBytes', () => {
  it('multiplies GB values by 1e9', () => {
    const gb = getTierLimitsGB('rare')
    const bytes = getTierLimitsBytes('rare')
    expect(bytes.storageBytes).toBe(gb.storageGB * 1e9)
    expect(bytes.trafficBytes).toBe(gb.trafficGB * 1e9)
  })

  it('falls back to default tier in bytes', () => {
    const fallback = getTierLimitsBytes(undefined)
    expect(fallback.storageBytes).toBe(DEFAULT_TIER_LIMITS_GB.storageGB * 1e9)
    expect(fallback.trafficBytes).toBe(DEFAULT_TIER_LIMITS_GB.trafficGB * 1e9)
  })
})
