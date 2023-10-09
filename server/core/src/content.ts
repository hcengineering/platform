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

import core, {
  Tx,
  Doc,
  TxCreateDoc,
  TxCollectionCUD,
  AttachedDoc,
  WorkspaceId,
  MeasureContext
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'

import type { ContentAdapter, ContentAdapterFactory, ContentTextAdapter } from './types'

import serverCore from './plugin'
import { Readable } from 'stream'

/**
 * @public
 */
export async function createModelContentAdapter (
  model: Tx[],
  workspace: WorkspaceId,
  context: MeasureContext
): Promise<ContentTextAdapter> {
  const adapters: Map<string, ContentAdapter> = new Map()

  for (let tx of model) {
    if (tx._class === core.class.TxCollectionCUD) {
      tx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
    }
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass === serverCore.class.ContentAdapterFactory) {
        const factory = (createTx as TxCreateDoc<ContentAdapterFactory>).attributes.factory
        const contentType = (createTx as TxCreateDoc<ContentAdapterFactory>).attributes.contentType
        const adapter = await getResource(factory).then((res) => res(workspace, context.newChild(contentType, {})))

        adapters.set(contentType, adapter)
      }
    }
  }

  return new ModelContentTextAdapter(adapters, context)
}

/**
 * @public
 */
export class ModelContentTextAdapter implements ContentTextAdapter {
  constructor (private readonly adapters: Map<string, ContentAdapter>, private readonly context: MeasureContext) {}

  async content (name: string, type: string, doc: Readable | Buffer | string): Promise<string> {
    const adapter = this.adapters.get('type') ?? this.adapters.get('*')
    return await (adapter?.(name, type, doc) ?? '')
  }

  metrics (): MeasureContext {
    return this.context
  }
}
