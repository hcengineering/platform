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

import core, { Class, ClassCollaborators, Doc, Hierarchy, ModelDb, Ref } from '@hcengineering/core'

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
