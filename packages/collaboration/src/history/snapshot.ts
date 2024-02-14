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
import * as Y from 'yjs'

import { YDocVersion, addVersion, getVersionData } from './history'

/** @public */
export function createYdocSnapshot (yContent: YDoc, yHistory: YDoc, version: YDocVersion): void {
  const snapshot = Y.snapshot(yContent)
  const update = Y.encodeSnapshot(snapshot)

  addVersion(yHistory, version, update)
}

/** @public */
export function restoreYdocSnapshot (yContent: YDoc, yHistory: YDoc, versionId: string): YDoc | undefined {
  const update = getVersionData(yHistory, versionId)
  if (update !== undefined) {
    const snapshot = Y.decodeSnapshot(update)
    return Y.createDocFromSnapshot(yContent, snapshot)
  }
}
