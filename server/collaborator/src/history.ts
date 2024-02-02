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
// import * as Y from 'yjs'

const HISTORY = '_history'
const UPDATES = '_updates'

export type HistoryItemId = string
export type HistoryItemData = Uint8Array

export function appendItem (ydoc: YDoc, id: HistoryItemId, update: HistoryItemData): void {
  const history = ydoc.getArray<HistoryItemId>(HISTORY)
  const updates = ydoc.getMap<HistoryItemData>(UPDATES)

  if (updates.has(id)) {
    throw Error('history item already exists')
  }

  ydoc.transact((tr) => {
    history.push([id])
    updates.set(id, update)
  })
}

export function deleteItem (ydoc: YDoc, id: HistoryItemId): void {
  const history = ydoc.getArray<HistoryItemId>(HISTORY)
  const snapshots = ydoc.getMap<HistoryItemData>(UPDATES)

  ydoc.transact((tr) => {
    const index = history.toArray().findIndex((p) => p === id)
    if (index !== -1) {
      history.delete(index, 1)
    }
    snapshots.delete(id)
  })
}

export function getItem (ydoc: YDoc, snapshotId: HistoryItemId): HistoryItemData | undefined {
  const snapshots = ydoc.getMap<HistoryItemData>(UPDATES)
  return snapshots.get(snapshotId)
}

// export function createSnapshot (ydoc: YDoc): void {
//   if (ydoc.gc) {
//     console.warn('creating snapshot of document with enabled GC')
//   }

//   const snapshot = Y.snapshot(ydoc)
//   const update = Y.encodeSnapshot(snapshot)
// }
