//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Doc, Ref, Space } from '@hcengineering/core'
import type { ToDo } from '@hcengineering/time'

/**
 * Drop ToDos attached to an archived space (e.g. an issue of an archived project).
 * ToDos without an attached space are kept.
 */
export function filterArchivedToDos<T extends Pick<ToDo, 'attachedSpace'>> (
  todos: T[],
  archivedSpaces: Set<Ref<Space>>
): T[] {
  if (archivedSpaces.size === 0) return todos
  return todos.filter((it) => it.attachedSpace === undefined || !archivedSpaces.has(it.attachedSpace))
}

/**
 * Drop calendar events (work slots) attached to one of the given hidden ToDos.
 */
export function filterArchivedWorkSlots<T extends { attachedTo?: Ref<Doc> }> (
  events: T[],
  archivedToDos: Set<Ref<ToDo>>
): T[] {
  if (archivedToDos.size === 0) return events
  return events.filter((it) => it.attachedTo === undefined || !archivedToDos.has(it.attachedTo as Ref<ToDo>))
}
