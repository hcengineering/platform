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
import { formatInviteDate } from '@hcengineering/setting-resources'

import login from './plugin'

/** Invite link restrictions. Negative values mean "no restriction". */
export interface InviteLinkParams {
  expHours: number
  limit: number
}

export interface InviteLinkSummaryItem {
  label: IntlString
  params?: Record<string, any>
}

/** Expiration used before workspace invite settings are loaded or when customizing a non-expiring link. */
export const DEFAULT_INVITE_EXP_HOURS = 48

const hourMs = 60 * 60 * 1000

export function isValidInviteLinkParams ({ expHours, limit }: InviteLinkParams): boolean {
  const ok = (value: number): boolean => value < 0 || (Number.isInteger(value) && value > 0)
  return ok(expHours) && ok(limit)
}

/**
 * Human-readable summary of link restrictions.
 * With `createdOn` the expiry is shown as a date, otherwise as a duration.
 */
export function summarizeInviteLink (
  { expHours, limit }: InviteLinkParams,
  createdOn?: number
): InviteLinkSummaryItem[] {
  const expiry: InviteLinkSummaryItem =
    expHours < 0
      ? { label: login.string.NoExpiration }
      : createdOn !== undefined
        ? { label: login.string.InviteLinkExpires, params: { date: formatInviteDate(createdOn + expHours * hourMs) } }
        : { label: login.string.ExpiresAfterHours, params: { count: expHours } }
  const usage: InviteLinkSummaryItem =
    limit < 0 ? { label: login.string.UnlimitedUses } : { label: login.string.UsesLimit, params: { count: limit } }
  return [expiry, usage]
}
