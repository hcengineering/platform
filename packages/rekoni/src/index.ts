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

import { concatLink } from '@hcengineering/core'
import { getMetadata, PlatformError, unknownError } from '@hcengineering/platform'
import plugin from './plugin'
import { ReconiDocument } from './types'

export { default } from './plugin'
export * from './types'

/**
 * @public
 */
export async function recognizeDocument (token: string, file: File): Promise<ReconiDocument> {
  const rekoniUrl = getMetadata(plugin.metadata.RekoniUrl)
  if (rekoniUrl === undefined) {
    // We could try use recognition service to find some document properties.
    throw new PlatformError(unknownError('recognition framework is not configured'))
  }
  const data = new FormData()
  data.append('file', file)
  data.append('type', file.type)
  data.append('name', file.name)

  return (await (
    await fetch(concatLink(rekoniUrl, '/recognize'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token
      },
      body: data
    })
  ).json()) as ReconiDocument
}
