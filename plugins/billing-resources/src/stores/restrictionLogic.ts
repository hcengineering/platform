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

import {
  GRACE_PERIOD_MS,
  type RestrictedFeature,
  type RestrictionMode,
  type RestrictionState
} from '@hcengineering/billing'
import { type UsageStatus } from '@hcengineering/core'

const EMPTY_FEATURES: ReadonlySet<RestrictedFeature> = new Set<RestrictedFeature>()
const RESTRICTED_FEATURES: ReadonlySet<RestrictedFeature> = new Set<RestrictedFeature>(['fileUpload'])

export const OK_RESTRICTION_STATE: RestrictionState = {
  mode: 'ok',
  restrictedFeatures: EMPTY_FEATURES
}

/**
 * Pure function — computes the {@link RestrictionState} from a snapshot of the
 * subscription/usage data and the current wall-clock time. No Svelte / browser
 * dependencies, intended for direct unit testing.
 *
 * @public
 */
export function computeRestrictionState (
  input: { usageInfo?: UsageStatus | undefined } | undefined,
  now: number,
  gracePeriodMs: number = GRACE_PERIOD_MS
): RestrictionState {
  const limitsExceededSince = input?.usageInfo?.limitsExceededSince
  if (limitsExceededSince === undefined) {
    return OK_RESTRICTION_STATE
  }

  const gracePeriodEndsAt = limitsExceededSince + gracePeriodMs
  const mode: RestrictionMode = now < gracePeriodEndsAt ? 'warning' : 'restricted'

  return {
    mode,
    limitsExceededSince,
    gracePeriodEndsAt,
    restrictedFeatures: mode === 'restricted' ? RESTRICTED_FEATURES : EMPTY_FEATURES
  }
}

/** @public */
export function isFeatureRestricted (feature: RestrictedFeature, state: RestrictionState): boolean {
  return state.restrictedFeatures.has(feature)
}
