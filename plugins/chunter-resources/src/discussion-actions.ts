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

import chunter, { type Discussion } from '@hcengineering/chunter'
import { type Doc, type DocumentQuery } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { canDeleteObject } from '@hcengineering/view-resources'

import { canDeleteDiscussion, canManageDiscussion, setDiscussionResolved } from './utils'

function getDiscussionActionTargets (doc?: Doc | Doc[]): Discussion[] {
  if (doc === undefined) return []
  const targets = Array.isArray(doc) ? doc : [doc]
  const hierarchy = getClient().getHierarchy()
  if (!targets.every((target): target is Discussion => hierarchy.isDerived(target._class, chunter.class.Discussion))) {
    return []
  }
  return targets
}

/**
 * Checks management access for every discussion in the action context.
 * @public
 */
export async function canManageDiscussionAction (doc?: Doc | Doc[]): Promise<boolean> {
  const targets = getDiscussionActionTargets(doc)
  return targets.length > 0 && targets.every(canManageDiscussion)
}

/**
 * Keeps configured defaults and the platform deletion permissions protected.
 * @public
 */
export async function canDeleteDiscussionAction (doc?: Doc | Doc[]): Promise<boolean> {
  const targets = getDiscussionActionTargets(doc)
  return (
    targets.length > 0 &&
    targets.every((discussion) => canManageDiscussion(discussion) && canDeleteDiscussion(discussion)) &&
    (await canDeleteObject(targets))
  )
}

/**
 * Resolves or reopens the selected discussions through the standard action system.
 * @public
 */
export async function setDiscussionResolvedAction (
  doc: Doc | Doc[] | undefined,
  _event?: Event,
  props?: Record<string, unknown>
): Promise<void> {
  const resolved = props?.resolved
  if (typeof resolved !== 'boolean' || !(await canManageDiscussionAction(doc))) return
  await Promise.all(getDiscussionActionTargets(doc).map((discussion) => setDiscussionResolved(discussion, resolved)))
}

/**
 * Viewlet option: hides resolved discussions from the list.
 * @public
 */
export function hideResolvedDiscussions (value: boolean, query: DocumentQuery<Doc>): DocumentQuery<Doc> {
  return value ? { ...query, resolved: false } : query
}
