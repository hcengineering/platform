//
// Copyright © 2026 TraceX SAS.
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

import type { IntlString } from '@hcengineering/platform'

import settingRes from './plugin'

export const HOURS_IN_DAY = 24

/** Expiration presets offered for invite links, in hours. Anything else is entered as a custom value. */
export const INVITE_EXPIRATION_PRESET_HOURS: readonly number[] = [24, 48, 168, 720]

/** Number of uses offered as the "one use" preset. */
export const INVITE_SINGLE_USE = 1

/** Duration used when the user switches from a preset to a custom value without having one. */
export const INVITE_DEFAULT_CUSTOM_HOURS = 48

/** Number of uses suggested when switching to a custom limit. */
export const INVITE_DEFAULT_CUSTOM_USES = 10

export interface InviteDurationLabel {
  label: IntlString
  params: { count: number }
}

/** True when the duration is a whole number of days, so it is shown in days rather than hours. */
export function isWholeDays (hours: number): boolean {
  return hours >= HOURS_IN_DAY && hours % HOURS_IN_DAY === 0
}

/** Label for a positive duration in hours, using days when the duration is a whole number of days. */
export function formatInviteDuration (hours: number): InviteDurationLabel {
  return isWholeDays(hours)
    ? { label: settingRes.string.InviteDays, params: { count: hours / HOURS_IN_DAY } }
    : { label: settingRes.string.InviteHours, params: { count: hours } }
}

/** Valid values are negative (no restriction) or positive whole numbers. */
export function isValidInviteRestriction (value: number | undefined): boolean {
  return value !== undefined && (value < 0 || (Number.isInteger(value) && value > 0))
}
