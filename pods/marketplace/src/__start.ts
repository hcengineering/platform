// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createAuthenticator, createRecipientResolver } from './auth'
import { createCatalogServer } from './server'
import { PostgresCatalogStore } from './store'

async function start (): Promise<void> {
  const databaseUrl = process.env.DB_URL
  const accountsUrl = process.env.ACCOUNTS_URL
  const secret = process.env.SERVER_SECRET
  if (!databaseUrl || !accountsUrl || !secret) throw new Error('DB_URL, ACCOUNTS_URL and SERVER_SECRET are required')
  const port = Number(process.env.PORT ?? 4008)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const store = new PostgresCatalogStore(databaseUrl)
  try {
    await store.init()
  } catch (error) {
    await store.close()
    throw error
  }
  const app = createCatalogServer({
    store,
    authenticate: createAuthenticator(accountsUrl, secret),
    resolveRecipient: createRecipientResolver(accountsUrl),
    trustedProxies: process.env.TRUST_PROXY?.split(',')
      .map((proxy) => proxy.trim())
      .filter((proxy) => proxy !== ''),
    onError: (error) => {
      console.error('Marketplace request failed', error)
    }
  })
  const server = app.listen(port)
  server.on('error', (error) => {
    console.error('Marketplace listener failed', error)
    store.close().catch((cause) => {
      console.error('Marketplace storage shutdown failed', cause)
    })
    process.exitCode = 1
  })
  function shutdown (): void {
    server.close(() => {
      store.close().catch((error) => {
        console.error('Marketplace storage shutdown failed', error)
        process.exitCode = 1
      })
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('Marketplace startup failed', error)
  process.exitCode = 1
})
