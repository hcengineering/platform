//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { YDocVersion } from '@hcengineering/collaboration'
import { Doc as YDoc } from 'yjs'
import { Context } from '../context'
import { CollaborativeDoc } from '@hcengineering/core'

export interface StorageAdapter {
  loadDocument: (documentId: string, collaborativeDoc: CollaborativeDoc, context: Context) => Promise<YDoc | undefined>

  saveDocument: (
    documentId: string,
    collaborativeDoc: CollaborativeDoc,
    document: YDoc,
    context: Context
  ) => Promise<void>

  takeSnapshot: (
    documentId: string,
    collaborativeDoc: CollaborativeDoc,
    document: YDoc,
    context: Context
  ) => Promise<YDocVersion | undefined>
}

export type StorageAdapters = Record<string, StorageAdapter>
