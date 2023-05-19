//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering, Inc.
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
import { Plugin, IntlString } from '@hcengineering/platform'
import type { Account, Class, Data, Doc, Domain, PluginConfiguration, Ref, Timestamp } from '../classes'
import { Space, ClassifierKind, DOMAIN_MODEL } from '../classes'
import { createClient, ClientConnection } from '../client'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { ModelDb, TxDb } from '../memdb'
import { TxOperations } from '../operations'
import type { DocumentQuery, FindResult, TxResult } from '../storage'
import { Tx, TxFactory, TxProcessor } from '../tx'
import { connect } from './connection'
import { genMinModel } from './minmodel'

describe('client', () => {
  it('should create client and spaces', async () => {
    const klass = core.class.Space
    const client = new TxOperations(await createClient(connect), core.account.System)
    const result = await client.findAll(klass, {})
    expect(result).toHaveLength(2)

    await client.createDoc<Space>(klass, core.space.Model, {
      private: false,
      name: 'NewSpace',
      description: '',
      archived: false,
      members: []
    })
    const result2 = await client.findAll(klass, {})
    expect(result2).toHaveLength(3)

    await client.createDoc(klass, core.space.Model, {
      private: false,
      name: 'NewSpace',
      description: '',
      members: [],
      archived: false
    })
    const result3 = await client.findAll(klass, {})
    expect(result3).toHaveLength(4)

    const result4 = await client.findOne(klass, {})
    expect(result4).toEqual(result3[0])
  })

  it('should create client with plugins', async () => {
    const txFactory = new TxFactory(core.account.System)
    const txes = genMinModel()

    txes.push(
      txFactory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        {
          label: 'PluginConfiguration' as IntlString,
          extends: core.class.Doc,
          kind: ClassifierKind.CLASS,
          domain: DOMAIN_MODEL
        },
        core.class.PluginConfiguration
      )
    )

    async function connectPlugin (handler: (tx: Tx) => void): Promise<ClientConnection> {
      const hierarchy = new Hierarchy()

      for (const tx of txes) hierarchy.tx(tx)

      const transactions = new TxDb(hierarchy)
      const model = new ModelDb(hierarchy)
      for (const tx of txes) {
        await transactions.tx(tx)
        await model.tx(tx)
      }

      async function findAll<T extends Doc> (_class: Ref<Class<T>>, query: DocumentQuery<T>): Promise<FindResult<T>> {
        return await transactions.findAll(_class, query)
      }

      return {
        findAll,
        tx: async (tx: Tx): Promise<TxResult> => {
          if (tx.objectSpace === core.space.Model) {
            hierarchy.tx(tx)
          }
          const result = await Promise.all([transactions.tx(tx)])
          return result[0]
        },
        close: async () => {},

        loadChunk: async (domain: Domain, idx?: number) => ({
          idx: -1,
          index: -1,
          docs: {},
          finished: true,
          digest: ''
        }),
        closeChunk: async (idx: number) => {},
        loadDocs: async (domain: Domain, docs: Ref<Doc>[]) => [],
        upload: async (domain: Domain, docs: Doc[]) => {},
        clean: async (domain: Domain, docs: Ref<Doc>[]) => {},
        loadModel: async (last: Timestamp) => txes,
        getAccount: async () => null as unknown as Account
      }
    }
    const spyCreate = jest.spyOn(TxProcessor, 'createDoc2Doc')
    const spyUpdate = jest.spyOn(TxProcessor, 'updateDoc2Doc')

    const pluginData1: Data<PluginConfiguration> = {
      pluginId: 'testPlugin1' as Plugin,
      transactions: [],
      beta: true,
      enabled: true
    }
    const txCreateDoc1 = txFactory.createTxCreateDoc(core.class.PluginConfiguration, core.space.Model, pluginData1)
    txes.push(txCreateDoc1)
    const client1 = new TxOperations(await createClient(connectPlugin, ['testPlugin1' as Plugin]), core.account.System)
    const result1 = await client1.findAll(core.class.PluginConfiguration, {})

    expect(result1).toHaveLength(1)
    expect(result1[0]._id).toStrictEqual(txCreateDoc1.objectId)
    expect(spyCreate).toHaveBeenLastCalledWith(txCreateDoc1)
    expect(spyUpdate).toBeCalledTimes(0)
    await client1.close()

    const pluginData2 = {
      pluginId: 'testPlugin2' as Plugin,
      transactions: [],
      beta: true,
      enabled: true
    }
    const txCreateDoc2 = txFactory.createTxCreateDoc(core.class.PluginConfiguration, core.space.Model, pluginData2)
    txes.push(txCreateDoc2)
    const client2 = new TxOperations(await createClient(connectPlugin, ['testPlugin1' as Plugin]), core.account.System)
    const result2 = await client2.findAll(core.class.PluginConfiguration, {})

    expect(result2).toHaveLength(2)
    expect(result2[0]._id).toStrictEqual(txCreateDoc1.objectId)
    expect(result2[1]._id).toStrictEqual(txCreateDoc2.objectId)
    expect(spyCreate).toHaveBeenLastCalledWith(txCreateDoc2)
    expect(spyUpdate).toBeCalledTimes(0)
    await client2.close()

    const pluginData3 = {
      pluginId: 'testPlugin3' as Plugin,
      transactions: [txCreateDoc1._id],
      beta: true,
      enabled: true
    }
    const txUpdateDoc = txFactory.createTxUpdateDoc(
      core.class.PluginConfiguration,
      core.space.Model,
      txCreateDoc1.objectId,
      pluginData3
    )
    txes.push(txUpdateDoc)
    const client3 = new TxOperations(await createClient(connectPlugin, ['testPlugin2' as Plugin]), core.account.System)
    const result3 = await client3.findAll(core.class.PluginConfiguration, {})

    expect(result3).toHaveLength(1)
    expect(result3[0]._id).toStrictEqual(txCreateDoc2.objectId)
    expect(spyCreate).toHaveBeenLastCalledWith(txCreateDoc2)
    expect(spyUpdate.mock.calls[1][1]).toStrictEqual(txUpdateDoc)
    expect(spyUpdate).toBeCalledTimes(2)
    await client3.close()

    spyCreate.mockReset()
    spyCreate.mockRestore()
    spyUpdate.mockReset()
    spyUpdate.mockRestore()
  })
})
