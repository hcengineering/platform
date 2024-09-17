import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { type TranslateRequest, type TranslateResponse } from '@hcengineering/ai-bot'

import aiBot from './plugin'

// TODO: change type to markup
export async function translate (text: string, lang: string): Promise<TranslateResponse | undefined> {
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
        Authorization: 'Bearer ' + token
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
