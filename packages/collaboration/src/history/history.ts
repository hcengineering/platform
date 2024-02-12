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

import { Doc as YDoc } from 'yjs'

/**
 * This module provides utils for document version storage based on YDoc
 *
 * At the top level the history document contains two fields:
 * 1. history
 *    An array containing version ids in creation order
 * 2. updates
 *    A map containing version data keyed by version id
 *
 * {
 *    "history": [
 *      "version1",
 *      "version2",
 *      ...
 *    ],
 *    "updates": {
 *      "version1": ... version data as ydoc update ...,
 *      "version2": ... version data as ydoc update ...,
 *      ...
 *    }
 * }
 */

const HISTORY = 'history'
const UPDATES = 'updates'

/** @public */
export function addVersion (ydoc: YDoc, versionId: string, update: Uint8Array): void {
  const history = ydoc.getArray<string>(HISTORY)
  const updates = ydoc.getMap<Uint8Array>(UPDATES)

  if (updates.has(versionId)) {
    throw Error('history item already exists')
  }

  ydoc.transact((tr) => {
    history.push([versionId])
    updates.set(versionId, update)
  })
}

/** @public */
export function getVersion (ydoc: YDoc, versionId: string): Uint8Array | undefined {
  const updates = ydoc.getMap<Uint8Array>(UPDATES)
  return updates.get(versionId)
}

/** @public */
export function deleteVersion (ydoc: YDoc, versionId: string): void {
  const history = ydoc.getArray<string>(HISTORY)
  const updates = ydoc.getMap<Uint8Array>(UPDATES)

  ydoc.transact((tr) => {
    const index = history.toArray().findIndex((p) => p === versionId)
    if (index !== -1) {
      history.delete(index, 1)
    }
    updates.delete(versionId)
  })
}
