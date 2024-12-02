//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Class, MarkupBlobRef, Doc, Ref } from './classes'

/** @public */
export interface CollaborativeDoc {
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectAttr: string
}

/** @public */
export function makeCollabId<T extends Doc, U extends keyof T> (
  objectClass: Ref<Class<T>>,
  objectId: Ref<T>,
  objectAttr: Extract<U, string> | string
): CollaborativeDoc {
  return { objectClass, objectId, objectAttr }
}

/** @public */
export function makeDocCollabId<T extends Doc, U extends keyof T> (
  doc: T,
  objectAttr: Extract<U, string> | string
): CollaborativeDoc {
  return makeCollabId(doc._class, doc._id, objectAttr)
}

/** @public */
export function makeCollabYdocId (doc: CollaborativeDoc): MarkupBlobRef {
  const { objectId, objectAttr } = doc
  return `${objectId}%${objectAttr}` as MarkupBlobRef
}

/** @public */
export function makeCollabJsonId (doc: CollaborativeDoc): MarkupBlobRef {
  const timestamp = Date.now()
  const { objectId, objectAttr } = doc
  return [objectId, objectAttr, timestamp].join('-') as MarkupBlobRef
}
