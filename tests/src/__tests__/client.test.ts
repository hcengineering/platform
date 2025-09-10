//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { createNetworkClient, shutdownNetworkTickMgr } from '@hcengineering/network-client'
import type { NetworkClient } from '@hcengineering/network-core'

jest.setTimeout(6000000)
describe('network client tests', () => {
  it('check client connect', async () => {
    let total = 0
    const count = 1000
    const clients: NetworkClient[] = []
    for (let i = 0; i < count; i++) {
      const st = performance.now()
      console.log('connecting agents: ' + i)
      const client = createNetworkClient('localhost', 37371)
      await client.waitConnection()

      // const agents = await client.agents()
      // expect(agents).toBeDefined()
      clients.push(client)
      const ed = performance.now()
      total += ed - st
    }
    console.log('Average connect time: ' + Math.round((10 * total) / count) / 10 + ' ms')
    for (const client of clients) {
      await client.close()
    }
  })
  afterAll(async () => {
    shutdownNetworkTickMgr()
  })
})
