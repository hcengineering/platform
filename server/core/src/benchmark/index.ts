//
// Copyright © 2022 Hardcore Engineering Inc.
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
  generateId,
  toFindResult,
  TxProcessor,
  type BenchmarkDoc,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  type TxResult,
  type WorkspaceId
} from '@hcengineering/core'
import type { DbAdapter } from '../adapter'
import { DummyDbAdapter } from '../mem'

function genData (dataSize: number): string {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < dataSize; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

let benchData = ''

class BenchmarkDbAdapter extends DummyDbAdapter {
  async findAll<T extends Doc<Space>>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    if (_class !== core.class.BenchmarkDoc) {
      return toFindResult([])
    }

    if (benchData === '') {
      benchData = genData(1024 * 1024)
    }

    const result: BenchmarkDoc[] = []

    const request: BenchmarkDoc['request'] = ((query as DocumentQuery<BenchmarkDoc>)
      .request as BenchmarkDoc['request']) ?? {
      documents: 1,
      size: 1
    }
    const docsToAdd =
      typeof request.documents === 'number'
        ? request.documents
        : request.documents.from + Math.random() * request.documents.to
    for (let i = 0; i < docsToAdd; i++) {
      const dataSize =
        typeof request.size === 'number' ? request.size : request.size.from + Math.random() * request.size.to
      result.push({
        _class: core.class.BenchmarkDoc,
        _id: generateId(),
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        space: core.space.DerivedTx, // To be available for all
        response: benchData.slice(0, dataSize)
      })
    }

    return toFindResult<T>(result as T[])
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    if (benchData === '') {
      benchData = genData(1024 * 1024)
    }
    for (const t of tx) {
      if (t._class === core.class.TxCreateDoc) {
        const doc = TxProcessor.createDoc2Doc(t as TxCreateDoc<BenchmarkDoc>)
        const request = doc.request

        if (request?.size != null) {
          const dataSize =
            typeof request.size === 'number' ? request.size : request.size.from + Math.random() * request.size.to
          return [
            {
              response: benchData.slice(0, dataSize)
            }
          ]
        }
      }
    }

    return [{}]
  }
}
/**
 * @public
 */
export async function createBenchmarkAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<DbAdapter> {
  return new BenchmarkDbAdapter()
}
