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
  Account,
  AccountClient,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  ModelDb,
  Ref,
  Tx,
  TxResult,
  WithLookup
} from '@hcengineering/core'
import { devModelId } from '@hcengineering/devmodel'
import { Builder } from '@hcengineering/model'
import { IntlString, Resources, getMetadata } from '@hcengineering/platform'
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

export const transactions: TxWitHResult[] = []

class ModelClient implements AccountClient {
  notifyEnabled = true
  constructor (readonly client: AccountClient) {
    this.notifyEnabled = (localStorage.getItem('#platform.notification.logging') ?? 'true') === 'true'

    client.notify = (tx) => {
      this.notify?.(tx)
      if (this.notifyEnabled) {
        console.debug('devmodel# notify=>', tx, this.client.getModel(), getMetadata(devmodel.metadata.DevModel))
      }
    }
  }

  notify?: (tx: Tx) => void

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
    const result = await this.client.findOne(_class, query, options)
    if (this.notifyEnabled) {
      console.debug(
        'devmodel# findOne=>',
        _class,
        query,
        options,
        'result => ',
        result,
        ' =>model',
        this.client.getModel(),
        getMetadata(devmodel.metadata.DevModel)
      )
    }
    return result
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const result = await this.client.findAll(_class, query, options)
    if (this.notifyEnabled) {
      console.debug(
        'devmodel# findAll=>',
        _class,
        query,
        options,
        'result => ',
        result,
        ' =>model',
        this.client.getModel(),
        getMetadata(devmodel.metadata.DevModel)
      )
    }
    return result
  }

  async tx (tx: Tx): Promise<TxResult> {
    const result = await this.client.tx(tx)
    if (this.notifyEnabled) {
      console.debug('devmodel# tx=>', tx, result, getMetadata(devmodel.metadata.DevModel))
    }
    transactions.push({ tx, result })
    if (transactions.length > 100) {
      transactions.shift()
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
