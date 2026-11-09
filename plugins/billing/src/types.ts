//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Doc, Timestamp } from '@hcengineering/core'
import { IntlString } from '@hcengineering/platform'

/** @public */
export interface Tier extends Doc {
  label: IntlString
  description: IntlString
  priceMonthly: number
  storageLimitGB: number
  trafficLimitGB: number

  index: number
  color?: string
}

/** @public */
export type RestrictionMode = 'ok' | 'warning' | 'restricted'

/** @public */
export type RestrictedFeature = 'fileUpload'

/** @public */
export interface RestrictionState {
  mode: RestrictionMode
  limitsExceededSince?: Timestamp // When the workspace first observed an over-limit state.
  gracePeriodEndsAt?: Timestamp // When the warning grace period ends and restrictions kick in.
  restrictedFeatures: ReadonlySet<RestrictedFeature> // Set of features currently restricted in 'restricted' mode. Empty otherwise.
}

/**
 * Default grace period between the moment a workspace exceeds its plan limits
 * and the moment functionality starts to be restricted.
 *
 * @public
 */
export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000
