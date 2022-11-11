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

import {
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  Hierarchy,
  ModelDb,
  Ref,
  StorageIterator,
  toFindResult,
  Tx,
  TxResult
} from '@hcengineering/core'
import { DbAdapter } from '@hcengineering/server-core'

class NullDbAdapter implements DbAdapter {
  async init (model: Tx[]): Promise<void> {}
  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    return toFindResult([])
  }

  async tx (tx: Tx): Promise<TxResult> {
    return {}
  }

  async close (): Promise<void> {}

  find (domain: Domain): StorageIterator {
    return {
      next: async () => undefined,
      close: async () => {}
    }
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}
}

/**
 * @public
 */
export async function createNullAdapter (
  hierarchy: Hierarchy,
  url: string,
  db: string,
  modelDb: ModelDb
): Promise<DbAdapter> {
  return new NullDbAdapter()
}

/**
 * @public
 */
export interface MinioConfig {
  endPoint: string
  accessKey: string
  secretKey: string
}
