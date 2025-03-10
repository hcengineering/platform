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

import { S3 } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

export interface S3Options {
  endpoint?: string
  region?: string
  accessKey: string
  secretKey: string
}

export function createClient (opt: S3Options): S3 {
  return new S3({
    endpoint: opt.endpoint,
    credentials: {
      accessKeyId: opt.accessKey,
      secretAccessKey: opt.secretKey
    },
    region: opt.region ?? 'auto',
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      socketTimeout: 120000,
      httpAgent: new HttpAgent({ maxSockets: 500, keepAlive: true }),
      httpsAgent: new HttpsAgent({ maxSockets: 500, keepAlive: true })
    })
  })
}
