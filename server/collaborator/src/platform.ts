//
// Copyright © 2023 Hardcore Engineering Inc.
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

import client from '@hcengineering/client'
import clientResources from '@hcengineering/client-resources'
import core, { Client, TxOperations } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { Token } from '@hcengineering/server-token'
import config from './config'

// eslint-disable-next-line
const WebSocket = require('ws')

export async function connect (transactorUrl: string, token: string): Promise<Client> {
  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': config.ServiceID
      }
    })
  })
  return await (await clientResources()).function.GetClient(token, transactorUrl)
}

export async function getTxOperations (client: Client, token: Token, isDerived: boolean = false): Promise<TxOperations> {
  const account = await client.findOne(core.class.Account, { email: token.email })
  const accountId = account?._id ?? core.account.System

  return new TxOperations(client, accountId, isDerived)
}
