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

import { createHash } from 'node:crypto'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

export async function getBufferSha256 (buffer: Buffer): Promise<string> {
  const hash = createHash('sha256')
  hash.write(buffer)
  return hash.digest('hex')
}

export async function getStreamSha256 (stream: Readable): Promise<string> {
  const hasher = createHash('sha256')
  stream.pipe(hasher)

  await new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  return hasher.digest('hex')
}

export async function getFileSha256 (path: string): Promise<string> {
  const stream = createReadStream(path)
  return await getStreamSha256(stream)
}
