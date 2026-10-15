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

import { isValidInviteRestriction } from '@hcengineering/setting-resources'

/** Invite link restrictions. Negative values mean "no restriction". */
export interface InviteLinkParams {
  expHours: number
  limit: number
}

/**
 * Expiration used instead of a "never expires" workspace default for users who may not create
 * non-expiring links (the server only allows those for maintainers and above).
 */
export const LIMITED_ROLE_INVITE_EXP_HOURS = 30 * 24

export function isValidInviteLinkParams ({ expHours, limit }: InviteLinkParams): boolean {
  return isValidInviteRestriction(expHours) && isValidInviteRestriction(limit)
}
