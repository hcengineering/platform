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
import { type Client } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'

export async function getClient (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  setMetadata(client.metadata.FilterModel, 'client')
  return await createClient(endpoint, token)
}
