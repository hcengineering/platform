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

import { type Readable, derived, writable } from 'svelte/store'
import { type RestrictionState } from '@hcengineering/billing'

import { subscriptionStore } from './subscription'
import { computeRestrictionState, isFeatureRestricted } from './restrictionLogic'

export { computeRestrictionState, isFeatureRestricted }

/**
 * Internal "tick" store. Bumped by the timer below so that derived restrictionStore
 * recomputes when the grace period ends without waiting for the next subscription poll.
 */
const restrictionTick = writable(0)

let scheduledTimer: ReturnType<typeof setTimeout> | undefined
let scheduledFor: number | undefined

function scheduleTick (at: number | undefined): void {
  if (at === undefined) {
    if (scheduledTimer !== undefined) {
      clearTimeout(scheduledTimer)
      scheduledTimer = undefined
      scheduledFor = undefined
    }
    return
  }

  if (scheduledFor === at && scheduledTimer !== undefined) {
    return
  }

  if (scheduledTimer !== undefined) {
    clearTimeout(scheduledTimer)
  }

  const delay = Math.max(0, at - Date.now())
  scheduledFor = at
  scheduledTimer = setTimeout(() => {
    scheduledTimer = undefined
    scheduledFor = undefined
    restrictionTick.update((n) => n + 1)
  }, delay)
}

/**
 * Derived store with the current restriction state. Recomputes whenever the
 * subscription store changes or the scheduled grace-period boundary timer fires.
 *
 * @public
 */
export const restrictionStore: Readable<RestrictionState> = derived([subscriptionStore, restrictionTick], ([$sub]) => {
  const state = computeRestrictionState($sub, Date.now())

  // Re-arm the boundary timer whenever the grace-period end moves.
  if (state.mode === 'warning' && state.gracePeriodEndsAt !== undefined) {
    scheduleTick(state.gracePeriodEndsAt)
  } else {
    scheduleTick(undefined)
  }

  return state
})
