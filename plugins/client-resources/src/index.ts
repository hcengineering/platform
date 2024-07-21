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

import clientPlugin from '@hcengineering/client'
import type { ClientFactoryOptions } from '@hcengineering/client/src'
import core, {
  AccountClient,
  LoadModelResponse,
  Tx,
  TxHandler,
  TxPersistenceStore,
  TxWorkspaceEvent,
  WorkspaceEvent,
  concatLink,
  createClient
} from '@hcengineering/core'
import platform, { Severity, Status, getMetadata, getPlugins, setPlatformStatus } from '@hcengineering/platform'
import { connect } from './connection'

export { connect }

let dbRequest: IDBOpenDBRequest | undefined
let dbPromise: Promise<IDBDatabase | undefined> = Promise.resolve(undefined)

if (typeof localStorage !== 'undefined') {
  const st = Date.now()
  dbPromise = new Promise<IDBDatabase>((resolve) => {
    dbRequest = indexedDB.open('model.db.persistence', 2)

    dbRequest.onupgradeneeded = function () {
      const db = (dbRequest as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('model')) {
        db.createObjectStore('model', { keyPath: 'id' })
      }
    }
    dbRequest.onsuccess = function () {
      const db = (dbRequest as IDBOpenDBRequest).result
      console.log('init DB complete', Date.now() - st)
      resolve(db)
    }
  })
}

/**
 * @public
 */
function decodeTokenPayload (token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (err: any) {
    console.error(err)
    return {}
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => {
  return {
    function: {
      GetClient: async (token: string, endpoint: string, opt?: ClientFactoryOptions): Promise<AccountClient> => {
        const filterModel = getMetadata(clientPlugin.metadata.FilterModel) ?? false

        const client = createClient(
          async (handler: TxHandler) => {
            const url = concatLink(endpoint, `/${token}`)

            const upgradeHandler: TxHandler = (...txes: Tx[]) => {
              for (const tx of txes) {
                if (tx?._class === core.class.TxModelUpgrade) {
                  opt?.onUpgrade?.()
                  return
                }
                if (tx?._class === core.class.TxWorkspaceEvent) {
                  const event = tx as TxWorkspaceEvent
                  if (event.event === WorkspaceEvent.MaintenanceNotification) {
                    void setPlatformStatus(
                      new Status(Severity.WARNING, platform.status.MaintenanceWarning, {
                        time: event.params.timeMinutes
                      })
                    )
                  }
                }
              }
              handler(...txes)
            }
            const tokenPayload: { workspace: string, email: string } = decodeTokenPayload(token)

            const newOpt = { ...opt }
            const connectTimeout = getMetadata(clientPlugin.metadata.ConnectionTimeout)
            let connectPromise: Promise<void> | undefined
            if ((connectTimeout ?? 0) > 0) {
              connectPromise = new Promise<void>((resolve, reject) => {
                const connectTO = setTimeout(() => {
                  if (!clientConnection.isConnected()) {
                    newOpt.onConnect = undefined
                    void clientConnection?.close()
                    void opt?.onDialTimeout?.()
                    reject(new Error(`Connection timeout, and no connection established to ${endpoint}`))
                  }
                }, connectTimeout)
                newOpt.onConnect = (event) => {
                  // Any event is fine, it means server is alive.
                  clearTimeout(connectTO)
                  resolve()
                }
              })
            }
            const clientConnection = connect(url, upgradeHandler, tokenPayload.workspace, tokenPayload.email, newOpt)
            if (connectPromise !== undefined) {
              await connectPromise
            }
            return await Promise.resolve(clientConnection)
          },
          filterModel ? [...getPlugins(), ...(getMetadata(clientPlugin.metadata.ExtraPlugins) ?? [])] : undefined,
          createModelPersistence(getWSFromToken(token)),
          opt?.ctx
        )
        return await client
      }
    }
  }
}
function createModelPersistence (workspace: string): TxPersistenceStore | undefined {
  const overrideStore = getMetadata(clientPlugin.metadata.OverridePersistenceStore)
  if (overrideStore !== undefined) {
    return overrideStore
  }

  return {
    load: async () => {
      const db = await dbPromise
      if (db !== undefined) {
        try {
          const transaction = db.transaction('model', 'readwrite') // (1)
          const models = transaction.objectStore('model') // (2)
          const model = await new Promise<{ id: string, model: LoadModelResponse } | undefined>((resolve) => {
            const storedValue: IDBRequest<{ id: string, model: LoadModelResponse }> = models.get(workspace)
            storedValue.onsuccess = function () {
              resolve(storedValue.result)
            }
            storedValue.onerror = function () {
              resolve(undefined)
            }
          })

          if (model == null) {
            return {
              full: false,
              transactions: [],
              hash: ''
            }
          }
          return model.model
        } catch (err: any) {
          // Assume no model is stored.
        }
      }
      return {
        full: true,
        transactions: [],
        hash: ''
      }
    },
    store: async (model) => {
      const db = await dbPromise
      if (db !== undefined) {
        const transaction = db.transaction('model', 'readwrite') // (1)
        const models = transaction.objectStore('model') // (2)
        models.put({ id: workspace, model })
      }
    }
  }
}

function getWSFromToken (token: string): string {
  const parts = token.split('.')

  const payload = parts[1]

  const decodedPayload = atob(payload)

  const parsedPayload = JSON.parse(decodedPayload)

  return parsedPayload.workspace
}
