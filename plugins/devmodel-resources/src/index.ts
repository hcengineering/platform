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
  type Account,
  type AccountClient,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type ModelDb,
  type Ref,
  type Tx,
  type TxResult,
  type WithLookup,
  type SearchQuery,
  type SearchOptions,
  type SearchResult,
  type MeasureDoneOperation,
  DOMAIN_MODEL
} from '@hcengineering/core'
import { devModelId } from '@hcengineering/devmodel'
import { Builder } from '@hcengineering/model'
import { type IntlString, type Resources, getMetadata } from '@hcengineering/platform'
import view from '@hcengineering/view'
import workbench from '@hcengineering/workbench'
import ModelView from './components/ModelView.svelte'
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

class ModelClient implements AccountClient {
  notifyEnabled = true
  constructor (readonly client: AccountClient) {
    this.notifyEnabled = (localStorage.getItem('#platform.notification.logging') ?? 'true') === 'true'

    client.notify = (...tx) => {
      this.notify?.(...tx)
      if (this.notifyEnabled) {
        console.debug('devmodel# notify=>', tx, this.client.getModel(), getMetadata(devmodel.metadata.DevModel))
      }
    }
  }

  async measure (operationName: string): Promise<MeasureDoneOperation> {
    return await this.client.measure(operationName)
  }

  notify?: (...tx: Tx[]) => void

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  async getAccount (): Promise<Account> {
    return await this.client.getAccount()
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    const startTime = Date.now()
    const isModel = this.getHierarchy().findDomain(_class) === DOMAIN_MODEL
    const result = await this.client.findOne(_class, query, options)
    if (this.notifyEnabled && !isModel) {
      console.debug(
        'devmodel# findOne=>',
        isModel,
        this.getHierarchy().findDomain(_class),
        _class,
        query,
        options,
        'result => ',
        result,
        ' =>model',
        this.client.getModel(),
        getMetadata(devmodel.metadata.DevModel),
        Date.now() - startTime
      )
    }
    return result
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const startTime = Date.now()
    const isModel = this.getHierarchy().findDomain(_class) === DOMAIN_MODEL
    const result = await this.client.findAll(_class, query, options)
    if (this.notifyEnabled && !isModel) {
      console.debug(
        'devmodel# findAll=>',
        _class,
        query,
        options,
        'result => ',
        result,
        ' =>model',
        this.client.getModel(),
        getMetadata(devmodel.metadata.DevModel),
        Date.now() - startTime
      )
    }
    return result
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    const result = await this.client.searchFulltext(query, options)
    if (this.notifyEnabled) {
      console.debug('devmodel# searchFulltext=>', query, options, 'result => ', result)
    }
    return result
  }

  async tx (tx: Tx): Promise<TxResult> {
    const startTime = Date.now()
    const result = await this.client.tx(tx)
    if (this.notifyEnabled) {
      console.debug('devmodel# tx=>', tx, result, getMetadata(devmodel.metadata.DevModel), Date.now() - startTime)
    }
    return result
  }

  async close (): Promise<void> {
    await this.client.close()
  }
}
export async function Hook (client: AccountClient): Promise<Client> {
  console.debug('devmodel# Client HOOKED by DevModel')

  // Client is alive here, we could hook with some model extensions special for DevModel plugin.
  const builder = new Builder()

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: 'DevModel' as IntlString,
      icon: view.icon.DevModel,
      alias: devModelId,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            label: 'Transactions' as IntlString,
            icon: view.icon.Table,
            id: 'transactions',
            component: devmodel.component.ModelView
          }
        ]
      }
    },
    devmodel.ids.DevModelApp
  )

  const model = client.getModel()
  for (const tx of builder.getTxes()) {
    await model.tx(tx)
  }

  return new ModelClient(client)
}

export function toIntl (value: string): IntlString {
  return value as IntlString
}

export default async (): Promise<Resources> => ({
  component: {
    ModelView
  },
  hook: {
    Hook
  }
})
