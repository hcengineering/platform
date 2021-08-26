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

import core, { Hierarchy, TxFactory } from '@anticrm/core'
import type { Tx } from '@anticrm/core'
import { createElasticAdapter } from '../adapter'

import * as txJson from './model.tx.json'

const txes = txJson as unknown as Tx[]

describe('client', () => {
  it('should create document', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of txes) hierarchy.tx(tx)
    const adapter = await createElasticAdapter(hierarchy, 'http://localhost:9200/', 'ws1')
    const txFactory = new TxFactory(core.account.System)
    const createTx = txFactory.createTxCreateDoc(core.class.Space, core.space.Model, {
      name: 'name',
      description: 'description',
      private: false,
      members: []
    })
    await adapter.tx(createTx)
    const spaces = await adapter.findAll(core.class.Space, {})
    console.log(spaces)
  })
})
