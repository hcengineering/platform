//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { PermissionsStore } from '@hcengineering/contact'
import type { DocumentQuery } from '@hcengineering/core'
import type { Milestone } from '@hcengineering/tracker'
import { canCreateObject } from '@hcengineering/view-resources'
import tracker from '../../plugin'

export function canCreateMilestone (
  space: DocumentQuery<Milestone>['space'] | undefined,
  isEditable: boolean,
  isAction: boolean,
  permissions: PermissionsStore
): boolean {
  if (!isEditable || isAction || typeof space !== 'string') return false
  // The permissions query loads asynchronously. Do not allow creation before this project is known.
  if (!permissions.whitelist.has(space) && permissions.ps[space] === undefined) return false
  return canCreateObject(tracker.class.Milestone, space, permissions)
}
