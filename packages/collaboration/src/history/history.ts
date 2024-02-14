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

import { Timestamp } from '@hcengineering/core'
import { fromByteArray, toByteArray } from 'base64-js'
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
 *      { "versionId": "version1", ... },
 *      { "versionId": "version2", ... },
 *      ...
 *    ],
 *    "updates": {
 *      "version1": ... version data as ydoc update base64 encoded ...,
 *      "version2": ... version data as ydoc update base64 encoded ...,
 *      ...
 *    }
 * }
 */

const HISTORY = 'history'
const UPDATES = 'updates'

/** @public */
export interface YDocVersion {
  versionId: string
  name: string

  createdBy: string // author email obtained from token
  createdOn: Timestamp
}

/** @public */
export function addVersion (ydoc: YDoc, version: YDocVersion, update: Uint8Array): void {
  const history = ydoc.getArray<YDocVersion>(HISTORY)
  const updates = ydoc.getMap<string>(UPDATES)

  const { versionId } = version

  if (updates.has(versionId)) {
    throw Error('history item already exists')
  }

  ydoc.transact((tr) => {
    history.push([version])
    updates.set(versionId, fromByteArray(update))
  })
}

/** @public */
export function getVersion (ydoc: YDoc, versionId: string): YDocVersion | undefined {
  const history = ydoc.getArray<YDocVersion>(HISTORY)
  return history.toArray().find((p) => p.versionId === versionId)
}

/** @public */
export function listVersions (ydoc: YDoc): YDocVersion[] {
  const history = ydoc.getArray<YDocVersion>(HISTORY)
  return history.toArray()
}

/** @public */
export function getVersionData (ydoc: YDoc, versionId: string): Uint8Array | undefined {
  const updates = ydoc.getMap<string>(UPDATES)
  const update = updates.get(versionId)
  return update !== undefined ? toByteArray(update) : undefined
}

/** @public */
export function deleteVersion (ydoc: YDoc, versionId: string): void {
  const history = ydoc.getArray<YDocVersion>(HISTORY)
  const updates = ydoc.getMap<string>(UPDATES)

  ydoc.transact((tr) => {
    const index = history.toArray().findIndex((p) => p.versionId === versionId)
    if (index !== -1) {
      history.delete(index, 1)
    }
    updates.delete(versionId)
  })
}
