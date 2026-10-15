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

import { AccountRole, concatLink } from '@hcengineering/core'
import login, { loginId } from '@hcengineering/login'
import { getMetadata, type IntlString } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'

import settingRes from './plugin'
import { HOURS_IN_DAY, isWholeDays } from './inviteDuration'

/** Builds the public join URL for an invite link. */
export function getInviteLinkUrl (inviteId: string, navigateUrl?: string): string {
  const loc = getCurrentLocation()
  loc.path[0] = loginId
  loc.path[1] = 'join'
  loc.path.length = 2
  loc.query = {
    inviteId
  }
  if (navigateUrl !== undefined) {
    loc.query.navigateUrl = navigateUrl
  }
  loc.fragment = undefined

  const url = locationToUrl(loc)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const host = frontUrl ?? document.location.origin
  return concatLink(host, url)
}

export function getInviteRoleLabel (role: AccountRole): IntlString {
  switch (role) {
    case AccountRole.Guest:
      return settingRes.string.Guest
    case AccountRole.Maintainer:
      return settingRes.string.Maintainer
    case AccountRole.Owner:
      return settingRes.string.Owner
    default:
      return settingRes.string.User
  }
}

export function formatInviteDate (value: number): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export interface InviteLinkSummaryItem {
  label: IntlString
  params?: Record<string, any>
}

const hourMs = 60 * 60 * 1000

/**
 * Human-readable summary of link restrictions.
 * With `createdOn` the expiry is shown as a date, otherwise as a duration.
 */
export function summarizeInviteLink (
  { expHours, limit }: { expHours: number, limit: number },
  createdOn?: number
): InviteLinkSummaryItem[] {
  const expiry: InviteLinkSummaryItem =
    expHours < 0
      ? { label: login.string.NoExpiration }
      : createdOn !== undefined
        ? { label: login.string.InviteLinkExpires, params: { date: formatInviteDate(createdOn + expHours * hourMs) } }
        : isWholeDays(expHours)
          ? { label: login.string.ExpiresAfterDays, params: { count: expHours / HOURS_IN_DAY } }
          : { label: login.string.ExpiresAfterHours, params: { count: expHours } }
  const usage: InviteLinkSummaryItem =
    limit < 0 ? { label: login.string.UnlimitedUses } : { label: login.string.UsesLimit, params: { count: limit } }
  return [expiry, usage]
}
