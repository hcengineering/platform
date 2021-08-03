//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering, Inc.
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

import { Space } from '../classes'
import { createClient } from '../client'
import core from '../component'
import { withOperations } from '../tx'
import { connect } from './connection'

describe('client', () => {
  it('client', async () => {
    const klass = core.class.Space
    const client = withOperations(core.account.System, await createClient(connect))
    const result = await client.findAll(klass, {})
    expect(result).toHaveLength(2)

    await client.createDoc<Space>(klass, core.space.Model, {
      private: false,
      name: 'NewSpace',
      description: '',
      members: []
    })
    const result2 = await client.findAll(klass, {})
    expect(result2).toHaveLength(3)

    await client.createDoc(klass, core.space.Model, { private: false, name: 'NewSpace', description: '', members: [] })
    const result3 = await client.findAll(klass, {})
    expect(result3).toHaveLength(4)
  })
})
