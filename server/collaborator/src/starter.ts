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

import { MinioService } from '@hcengineering/minio'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'
import { MongoClient } from 'mongodb'

import config from './config'
import { metricsContext } from './metrics'
import { start } from './server'

export async function startCollaborator (): Promise<void> {
  setMetadata(serverToken.metadata.Secret, config.Secret)

  let minioPort = 9000
  let minioEndpoint = config.MinioEndpoint
  const sp = minioEndpoint.split(':')
  if (sp.length > 1) {
    minioEndpoint = sp[0]
    minioPort = parseInt(sp[1])
  }

  const minioClient = new MinioService({
    endPoint: minioEndpoint,
    port: minioPort,
    useSSL: false,
    accessKey: config.MinioAccessKey,
    secretKey: config.MinioSecretKey
  })

  const mongoClient = await MongoClient.connect(config.MongoUrl)

  const shutdown = await start(metricsContext, config, minioClient, mongoClient)

  const close = (): void => {
    void mongoClient.close()
    void shutdown()
  }

  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
