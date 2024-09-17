//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { concatLink, type Markup } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { type TranslateRequest, type TranslateResponse } from '@hcengineering/ai-bot'

import aiBot from './plugin'

export async function translate (text: Markup, lang: string): Promise<TranslateResponse | undefined> {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''

  if (url === '' || token === '') {
    return undefined
  }

  try {
    const req: TranslateRequest = { text, lang }
    const resp = await fetch(concatLink(url, '/translate'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req)
    })
    if (!resp.ok) {
      return undefined
    }

    return (await resp.json()) as TranslateResponse
  } catch (error) {
    console.error(error)
    return undefined
  }
}
