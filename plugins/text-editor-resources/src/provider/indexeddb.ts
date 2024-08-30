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
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'

import { type Doc as YDoc } from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { type Awareness } from 'y-protocols/awareness'

import { type Provider } from './types'

export class IndexeddbProvider extends IndexeddbPersistence implements Provider {
  readonly loaded: Promise<void>
  readonly awareness: Awareness | null = null

  constructor (documentId: string, doc: YDoc) {
    const workspaceId: string = getMetadata(presentation.metadata.WorkspaceId) ?? ''

    const name = `${workspaceId}/${documentId}`

    super(name, doc)

    this.loaded = new Promise((resolve) => {
      this.on('synced', resolve)
    })
  }

  async destroy (): Promise<void> {
    await super.destroy()
  }
}
