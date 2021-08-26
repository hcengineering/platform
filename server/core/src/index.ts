//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Doc, Tx, TxCreateDoc, Ref, Class, ServerStorage, DocumentQuery, FindOptions, FindResult, Storage, Account, Domain, TxCUD } from '@anticrm/core'
import core, { Hierarchy, TxFactory, DOMAIN_TX } from '@anticrm/core'
import type { Resource, Plugin } from '@anticrm/platform'
import { getResource, plugin } from '@anticrm/platform'

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, txFactory: TxFactory) => Promise<Tx[]>

/**
  * @public
  */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>
}

/**
 * @public
 */
export class Triggers {
  private readonly triggers: TriggerFunc[] = []

  async tx (tx: Tx): Promise<void> {
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass === serverCore.class.Trigger) {
        const trigger = (createTx as TxCreateDoc<Trigger>).attributes.trigger
        const func = await getResource(trigger)
        this.triggers.push(func)
      }
    }
  }

  async apply (account: Ref<Account>, tx: Tx): Promise<Tx[]> {
    const derived = this.triggers.map(trigger => trigger(tx, new TxFactory(account)))
    const result = await Promise.all(derived)
    return result.flatMap(x => x)
  }
}

/**
 * @public
 */
export interface DbAdapter extends Storage {
  /**
   * Method called after hierarchy is ready to use.
   */
  init: (model: Tx[]) => Promise<void>
}

/**
 * @public
 */
export interface TxAdapter extends DbAdapter {
  getModel: () => Promise<Tx[]>
}

/**
 * @public
 */
export type DbAdapterFactory = (hierarchy: Hierarchy, url: string, db: string) => Promise<DbAdapter>

/**
 * @public
 */
export interface DbAdapterConfiguration {
  factory: DbAdapterFactory
  url: string
}

/**
 * @public
 */
export interface DbConfiguration {
  adapters: Record<string, DbAdapterConfiguration>
  domains: Record<string, string>
  defaultAdapter: string
  workspace: string
}

class TServerStorage implements ServerStorage {
  constructor (
    private readonly domains: Record<string, string>,
    private readonly defaultAdapter: string,
    private readonly adapters: Map<string, DbAdapter>,
    private readonly hierarchy: Hierarchy,
    private readonly triggers: Triggers
  ) {
  }

  private getAdapter (domain: Domain): DbAdapter {
    const name = this.domains[domain] ?? this.defaultAdapter
    const adapter = this.adapters.get(name)
    if (adapter === undefined) {
      throw new Error('adapter not provided: ' + name)
    }
    return adapter
  }

  private routeTx (tx: Tx): Promise<void> {
    if (this.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const txCUD = tx as TxCUD<Doc>
      const domain = this.hierarchy.getDomain(txCUD.objectClass)
      return this.getAdapter(domain).tx(txCUD)
    } else {
      throw new Error('not implemented (not derived from TxCUD)')
    }
  }

  async findAll<T extends Doc> (
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(clazz)
    return await this.getAdapter(domain).findAll(clazz, query, options)
  }

  async tx (tx: Tx): Promise<Tx[]> {
    // maintain hiearachy and triggers
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.triggers.tx(tx)
    }

    // store tx
    await this.getAdapter(DOMAIN_TX).tx(tx)

    // store object
    await this.routeTx(tx)
    const derived = await this.triggers.apply(tx.modifiedBy, tx)
    for (const tx of derived) {
      await this.routeTx(tx)
    }
    return derived
  }
}

/**
 * @public
 */
export async function createServerStorage (conf: DbConfiguration): Promise<ServerStorage> {
  const hierarchy = new Hierarchy()
  const triggers = new Triggers()
  const adapters = new Map<string, DbAdapter>()

  for (const key in conf.adapters) {
    const adapterConf = conf.adapters[key]
    adapters.set(key, await adapterConf.factory(hierarchy, adapterConf.url, conf.workspace))
  }

  const txAdapter = adapters.get(conf.domains[DOMAIN_TX]) as TxAdapter
  if (txAdapter === undefined) {
    console.log('no txadapter found')
  }

  const model = await txAdapter.getModel()

  for (const tx of model) {
    hierarchy.tx(tx)
    await triggers.tx(tx)
  }

  for (const [, adapter] of adapters) {
    await adapter.init(model)
  }

  return new TServerStorage(conf.domains, conf.defaultAdapter, adapters, hierarchy, triggers)
}

/**
 * @public
 */
export const serverCoreId = 'server-core' as Plugin

/**
 * @public
 */
const serverCore = plugin(serverCoreId, {
  class: {
    Trigger: '' as Ref<Class<Trigger>>
  }
})

export default serverCore
