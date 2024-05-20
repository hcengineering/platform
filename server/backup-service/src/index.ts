//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { MeasureContext, systemAccountEmail } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { setMetadata } from '@hcengineering/platform'
import { backupService } from '@hcengineering/server-backup'
import serverToken, { generateToken } from '@hcengineering/server-token'
import toolPlugin from '@hcengineering/server-tool'
import config from './config'
import { StorageAdapter } from '@hcengineering/server-core'

export function startBackup (ctx: MeasureContext): void {
  setMetadata(serverToken.metadata.Secret, config.Secret)

  let minioPort = 9000
  let minioEndpoint = config.MinioEndpoint
  const sp = minioEndpoint.split(':')
  if (sp.length > 1) {
    minioEndpoint = sp[0]
    minioPort = parseInt(sp[1])
  }

  const storageAdapter: StorageAdapter = new MinioService({
    endpoint: minioEndpoint,
    port: minioPort,
    useSSL: 'false',
    accessKey: config.MinioAccessKey,
    secretKey: config.MinioSecretKey
  })

  setMetadata(toolPlugin.metadata.UserAgent, config.ServiceID)

  // A token to access account service
  const token = generateToken(systemAccountEmail, { name: 'backup', productId: '' })

  const shutdown = backupService(ctx, storageAdapter, { ...config, Token: token })

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    ctx.error('uncaughtException', { err: e })
  })
  process.on('unhandledRejection', (e) => {
    ctx.error('unhandledRejection', { err: e })
  })
}
