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

import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'

import type { MeasureContext } from '@hcengineering/core'
import type { StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import config from './config'
import { start } from './server'

export async function startCollaborator (ctx: MeasureContext, onClose?: () => void): Promise<void> {
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig, config.MongoUrl)

  const shutdown = await start(ctx, config, storageAdapter)

  const close = (): void => {
    void storageAdapter.close()
    void shutdown()
    onClose?.()
  }

  process.on('uncaughtException', (e) => {
    ctx.error('UncaughtException', { error: e })
  })

  process.on('unhandledRejection', (reason, promise) => {
    ctx.error('Unhandled Rejection at:', { promise, reason })
  })

  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
