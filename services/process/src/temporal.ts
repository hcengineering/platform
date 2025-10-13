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

import { Client, Connection } from '@temporalio/client'
import config from './config'

let temporalConnection: Connection | Promise<Connection> | undefined

export async function closeTemporal (): Promise<void> {
  if (temporalConnection !== undefined) {
    if (temporalConnection instanceof Promise) {
      temporalConnection = await temporalConnection
    }
    await temporalConnection.close()
  }
}

export async function getTemporalClient (): Promise<Client> {
  if (temporalConnection === undefined) {
    temporalConnection = Connection.connect({
      address: config.TemporalAddress
    })
  }
  const temporalClient = new Client({
    connection: await temporalConnection,
    namespace: config.TemporalNamespace
  })
  return temporalClient
}
