//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import client, { clientId } from '@hcengineering/client'
import { Client, systemAccountEmail, WorkspaceId } from '@hcengineering/core'
import { addLocation, getResource, setMetadata } from '@hcengineering/platform'
import { generateToken } from '@hcengineering/server-token'

/**
 * @public
 */
export async function connect (
  transactorUrl: string,
  workspace: WorkspaceId,
  email?: string,
  extra?: Record<string, string>
): Promise<Client> {
  const token = generateToken(email ?? systemAccountEmail, workspace, extra)

  // We need to override default factory with 'ws' one.
  // eslint-disable-next-line
  const WebSocket = require('ws')

  setMetadata(client.metadata.ClientSocketFactory, (url) => new WebSocket(url))
  addLocation(clientId, () => import('@hcengineering/client-resources'))

  return await (
    await getResource(client.function.GetClient)
  )(token, transactorUrl)
}
