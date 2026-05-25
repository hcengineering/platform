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

import core, {
  AttachedDoc,
  Class,
  ClassCollaborators,
  Doc,
  DocumentQuery,
  Hierarchy,
  ModelDb,
  Ref
} from '.'

export function getClassCollaborators<T extends Doc> (
  model: ModelDb,
  hiearachy: Hierarchy,
  _id: Ref<Class<T>>
): ClassCollaborators<T> | undefined {
  const ancestors = hiearachy.getAncestors(_id)
  const collabs = new Map(
    model
      .findAllSync(core.class.ClassCollaborators, {
        attachedTo: { $in: ancestors }
      })
      .map((c) => [c.attachedTo, c])
  )
  for (const ancestor of ancestors) {
    const res = collabs.get(ancestor)
    if (res !== undefined) {
      return res
    }
  }
}

/**
 * Walk a Doc's attachedTo chain to find the nearest ancestor (including the
 * Doc itself) whose ClassCollaborators has BOTH provideSecurity===true AND
 * mentionsGrantAccess===true. Returns that ancestor Doc as the grant target,
 * or null if no such class is reached within the depth cap.
 *
 * Used by both the chunter mention-trigger (server) and the warning popup
 * (client) so the disclosure UX matches the actual server-side grant. The
 * helper is isomorphic via the findAll dependency injection — server passes
 * `(cls, q) => control.findAll(control.ctx, cls, q)`, client passes
 * `(cls, q) => getClient().findAll(cls, q)`.
 *
 * The ClassCollaborators lookup is exact-class (not inherited via ancestors)
 * — adequate for tracker.class.Issue and avoids surprising matches on
 * abstract base classes like AttachedDoc. If future opt-in classes need
 * inherited semantics, switch to `getClassCollaborators(model, hierarchy, _class)`
 * here (requires plumbing ModelDb + Hierarchy through the dependency
 * injection — kept out for now to keep the helper isomorphic without
 * the ModelDb tax on the client).
 *
 * Depth cap (8) defends against pathological attachedTo cycles.
 */
export async function resolveMentionGrantTarget (
  start: Doc,
  findAll: <T extends Doc>(cls: Ref<Class<T>>, q: DocumentQuery<T>) => Promise<T[]>
): Promise<Doc | null> {
  let cur: Doc | undefined = start
  for (let i = 0; i < 8 && cur != null; i++) {
    const cc = (await findAll(core.class.ClassCollaborators, {
      attachedTo: cur._class
    } as DocumentQuery<ClassCollaborators<Doc>>))[0]
    if (cc?.provideSecurity === true && cc.mentionsGrantAccess === true) {
      return cur
    }
    const attached = cur as AttachedDoc
    if (attached.attachedTo == null || attached.attachedToClass == null) {
      return null
    }
    const parent = (await findAll(attached.attachedToClass, {
      _id: attached.attachedTo
    } as DocumentQuery<Doc>))[0]
    cur = parent
  }
  return null
}
