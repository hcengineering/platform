//
// Copyright © 2020 Anticrm Platform Contributors.
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
  DOMAIN_MODEL,
  cutObjectArray,
  platformNow,
  platformNowDiff,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Tx,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'
import { getMetadata, type IntlString, type Resources } from '@hcengineering/platform'
import { addTxListener } from '@hcengineering/presentation'
import type { ClientHook } from '@hcengineering/presentation/src/plugin'
import { testing } from '@hcengineering/ui'
import devmodel from './plugin'

export interface TxWitHResult {
  tx: Tx
  result: TxResult
}

export interface QueryWithResult {
  _class: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
  options?: FindOptions<Doc>
  result: FindResult<Doc>
  findOne: boolean
}

export class PresentationClientHook implements ClientHook {
  notifyEnabled = true
  constructor () {
    this.notifyEnabled = (localStorage.getItem('#platform.notification.logging') ?? 'true') === 'true'

    addTxListener((tx) => {
      if (this.notifyEnabled) {
        const rtx = tx.filter((tx) => (tx as any).objectClass !== core.class.BenchmarkDoc)
        if (rtx.length > 0) {
          console.debug('devmodel# notify=>', testing ? cutObjectArray(rtx) : rtx.length === 1 ? rtx[0] : tx)
        }
      }
    })
  }

  stackLine (): string {
    const stack = (new Error().stack ?? '').split('\n')

    let candidate = ''
    for (let l of stack) {
      l = l.trim()
      if (l.includes('.svelte')) {
        return l
      }
      if (l.includes('plugins/') && !l.includes('devmodel-resources/') && l.includes('.ts') && candidate === '') {
        candidate = l
      }
    }
    return candidate
  }

  async findOne<T extends Doc>(
    client: Client,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    const startTime = platformNow()
    const isModel = client.getHierarchy().findDomain(_class) === DOMAIN_MODEL
    const result = await client.findOne(_class, query, options)
    if (this.notifyEnabled && !isModel) {
      console.debug(
        'devmodel# findOne=>',
        _class,
        testing ? JSON.stringify(cutObjectArray(query)) : query,
        options,
        'result => ',
        testing ? JSON.stringify(cutObjectArray(result)) : result,
        ' =>model',
        client.getModel(),
        getMetadata(devmodel.metadata.DevModel),
        platformNow() - startTime,
        this.stackLine()
      )
    }
    return result
  }

  async findAll<T extends Doc>(
    client: Client,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const startTime = platformNow()
    const isModel = client.getHierarchy().findDomain(_class) === DOMAIN_MODEL
    const result = await client.findAll(_class, query, options)
    if (this.notifyEnabled && !isModel) {
      console.debug(
        'devmodel# findAll=>',
        _class,
        testing ? JSON.stringify(cutObjectArray(query)).slice(0, 160) : query,
        options,
        'result => ',
        testing ? JSON.stringify(cutObjectArray(result)).slice(0, 160) : result,
        ' =>model',
        client.getModel(),
        getMetadata(devmodel.metadata.DevModel),
        platformNow() - startTime,
        JSON.stringify(result).length,
        this.stackLine()
      )
    }
    return result
  }

  async searchFulltext (client: Client, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    const result = await client.searchFulltext(query, options)
    if (this.notifyEnabled) {
      console.debug(
        'devmodel# searchFulltext=>',
        testing ? JSON.stringify(cutObjectArray(query)).slice(0, 160) : query,
        options,
        'result => ',
        result
      )
    }
    return result
  }

  async tx (client: Client, tx: Tx): Promise<TxResult> {
    const startTime = platformNow()
    const result = await client.tx(tx)
    if (this.notifyEnabled && (tx as any).objectClass !== core.class.BenchmarkDoc) {
      console.debug(
        'devmodel# tx=>',
        testing ? JSON.stringify(cutObjectArray(tx)).slice(0, 160) : tx,
        result,
        getMetadata(devmodel.metadata.DevModel),
        platformNowDiff(startTime),
        this.stackLine()
      )
    }
    return result
  }
}

export function toIntl (value: string): IntlString {
  return value as IntlString
}

export default async (): Promise<Resources> => ({})
