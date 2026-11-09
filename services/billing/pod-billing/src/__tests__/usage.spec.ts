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

import { getTierLimitsBytes } from '@hcengineering/billing'

import { computeLimitsExceededSince } from '../usage'

describe('computeLimitsExceededSince', () => {
  const now = 1_700_000_000_000

  it('returns undefined when not exceeded', () => {
    expect(computeLimitsExceededSince(undefined, false, now)).toBeUndefined()
  })

  it('clears the timestamp when usage drops back under the limit', () => {
    expect(computeLimitsExceededSince(now - 60_000, false, now)).toBeUndefined()
  })

  it('starts the timestamp at "now" on the first over-limit observation', () => {
    expect(computeLimitsExceededSince(undefined, true, now)).toBe(now)
  })

  it('preserves the existing timestamp on subsequent over-limit observations', () => {
    const earlier = now - 60_000
    expect(computeLimitsExceededSince(earlier, true, now)).toBe(earlier)
  })
})

describe('getTierLimitsBytes', () => {
  it('returns common-tier defaults for unknown plan', () => {
    const limits = getTierLimitsBytes('mystery')
    expect(limits.storageBytes).toBe(10 * 1e9)
    expect(limits.trafficBytes).toBe(10 * 1e9)
  })

  it('returns common-tier defaults when plan is undefined', () => {
    const limits = getTierLimitsBytes(undefined)
    expect(limits.storageBytes).toBe(10 * 1e9)
    expect(limits.trafficBytes).toBe(10 * 1e9)
  })

  it('matches plan name case-insensitively', () => {
    expect(getTierLimitsBytes('Rare').storageBytes).toBe(100 * 1e9)
    expect(getTierLimitsBytes('rare').storageBytes).toBe(100 * 1e9)
    expect(getTierLimitsBytes('RARE').storageBytes).toBe(100 * 1e9)
  })

  it('returns Legendary plan limits', () => {
    const limits = getTierLimitsBytes('legendary')
    expect(limits.storageBytes).toBe(10000 * 1e9)
    expect(limits.trafficBytes).toBe(2000 * 1e9)
  })
})
