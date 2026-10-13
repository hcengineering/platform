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

import { deepEqual } from 'fast-equals'
import core, {
  type AccountUuid,
  type AttachedData,
  type Classifier,
  type Doc,
  type ObjectVisibility,
  type Ref,
  TxOperations,
  visibilityToAudience
} from '@hcengineering/core'

import chunter, { type DefaultDiscussion, type Discussion, DirectMessage } from '.'

/**
 * @public
 */
export async function getDirectChannel (
  client: TxOperations,
  me: AccountUuid,
  employeeAccount: AccountUuid
): Promise<Ref<DirectMessage>> {
  const accIds = [me, employeeAccount].sort()
  const existingDms = await client.findAll(chunter.class.DirectMessage, {})
  for (const dm of existingDms) {
    if (deepEqual(dm.members, accIds)) {
      return dm._id
    }
  }

  return await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: accIds
  })
}

/**
 * The name, or undefined for an untitled discussion.
 * @public
 */
export function getDiscussionTitle (discussion: Pick<Discussion, 'name'>): string | undefined {
  const name = discussion.name?.trim() ?? ''
  return name !== '' ? name : undefined
}

/**
 * Adds the access policy for a non-public discussion. The policy goes with the create tx,
 * so the discussion is never visible to the whole space.
 * @public
 */
export function withDiscussionVisibility (
  data: AttachedData<Discussion>,
  visibility: ObjectVisibility
): AttachedData<Discussion> {
  if (visibility === 'public') return data
  // The computed mixin key is not checked as an excess property, so no assertion is needed.
  const attributes: AttachedData<Discussion> = {
    ...data,
    [core.mixin.AccessControlled]: { read: visibilityToAudience(visibility) }
  }
  return attributes
}

/**
 * Visibility levels allowed for default discussions: a private one would be visible to its creator only,
 * so other participants of the object could never open it.
 * @public
 */
export const defaultDiscussionVisibilityLevels: ObjectVisibility[] = ['public', 'participants']

/**
 * Default discussions of a class chain, ordered from the topmost ancestor to the concrete class.
 * @public
 */
export function getEffectiveDefaultDiscussions (
  configs: DefaultDiscussion[],
  ancestors: Ref<Classifier>[]
): DefaultDiscussion[] {
  return [...ancestors].reverse().flatMap((ofClass) => configs.filter((config) => config.ofClass === ofClass))
}

/**
 * The visibility a default discussion is created with. Private is not allowed for default discussions.
 * @public
 */
export function getDefaultDiscussionVisibility (config: Pick<DefaultDiscussion, 'visibility'>): ObjectVisibility {
  return defaultDiscussionVisibilityLevels.includes(config.visibility) ? config.visibility : 'participants'
}

/**
 * @public
 */
export async function ensureObjectCollaborator (
  client: TxOperations,
  object: Pick<Doc, '_id' | '_class' | 'space'>,
  account: AccountUuid
): Promise<void> {
  const current = await client.findOne(core.class.Collaborator, { attachedTo: object._id, collaborator: account })
  if (current !== undefined) return
  await client.addCollection(core.class.Collaborator, object.space, object._id, object._class, 'collaborators', {
    collaborator: account
  })
}
