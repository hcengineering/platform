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
import { concatLink, type Doc, type Markup } from '@hcengineering/core'
import { getMetadata, translate as translateS } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { type TranslateRequest, type TranslateResponse } from '@hcengineering/ai-bot'
import { type InlineCommandAction } from '@hcengineering/text-editor'
import { parseInlineCommands } from '@hcengineering/text-editor-resources'
import { createPrivateMessage, createPrivateThreadMessage } from '@hcengineering/chunter'
import { personSpaceStore } from '@hcengineering/contact-resources'
import {
  htmlToMarkup,
  jsonToMarkup,
  MarkupMarkType,
  type MarkupNode,
  MarkupNodeType,
  markupToJSON,
  nodeDoc
} from '@hcengineering/text'
import { languageStore } from '@hcengineering/ui'
import { get } from 'svelte/store'
import activity, { type ActivityMessage } from '@hcengineering/activity'

import aiBot from './plugin'
import { languages } from './langs'

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

export function isAiEnabled (): boolean {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''

  return url !== ''
}

async function getHelpMarkup (): Promise<Markup> {
  const lang = get(languageStore)
  return jsonToMarkup({
    type: MarkupNodeType.doc,
    content: [
      {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            text: await translateS(aiBot.string.TranslateHelp, {}, lang)
          }
        ]
      },
      {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            marks: [{ type: MarkupMarkType.code, attrs: {} }],
            text: '/translate [lang] [text to translate]'
          }
        ]
      },
      {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            text: await translateS(aiBot.string.Where, {}, lang)
          },
          {
            type: MarkupNodeType.text,
            marks: [{ type: MarkupMarkType.code, attrs: {} }],
            text: ' [lang] '
          },
          {
            type: MarkupNodeType.text,
            text: await translateS(aiBot.string.CodesHelp, {}, lang)
          }
        ]
      },
      {
        type: MarkupNodeType.paragraph,
        content: getLanguageMarkupNodes()
      }
    ]
  })
}

function getLanguageMarkupNodes (): MarkupNode[] {
  return Object.entries(languages)
    .map(([key, value]) => [
      {
        type: MarkupNodeType.text,
        marks: [{ type: MarkupMarkType.code, attrs: {} }],
        text: key
      },
      {
        type: MarkupNodeType.text,
        text: ` (${value})`
      },
      {
        type: MarkupNodeType.hard_break,
        content: []
      }
    ])
    .flatMap((x) => x)
}

async function sendMessage (markup: Markup, doc: Pick<Doc, '_id' | '_class'>): Promise<void> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  if (hierarchy.isDerived(doc._class, activity.class.ActivityMessage)) {
    const msg = await client.findOne(doc._class, { _id: doc._id })
    if (msg === undefined) return
    await createPrivateThreadMessage(
      client,
      markup,
      get(personSpaceStore)._id,
      msg as ActivityMessage,
      aiBot.account.AIBot
    )
  } else {
    await createPrivateMessage(client, markup, get(personSpaceStore)._id, doc, aiBot.account.AIBot)
  }
}

export const translateInlineCommand: InlineCommandAction = async (markup, context) => {
  const {
    args: [lang],
    markup: clearMarkup
  } = parseInlineCommands(markup, 1)

  if ((languages as any)[lang] === undefined) {
    await sendMessage(await getHelpMarkup(), { _id: context.objectId, _class: context.objectClass })
    return
  }

  const resp = await translate(clearMarkup, lang)

  if (resp === undefined) {
    const message = await translateS(aiBot.string.CantTranslateThisText, {}, get(languageStore))
    await sendMessage(htmlToMarkup(message), { _id: context.objectId, _class: context.objectClass })
    return
  }

  const result = nodeDoc(
    {
      type: MarkupNodeType.blockquote,
      content: markupToJSON(clearMarkup).content
    },
    {
      type: MarkupNodeType.paragraph,
      content: markupToJSON(resp.text).content
    }
  )

  await sendMessage(jsonToMarkup(result), { _id: context.objectId, _class: context.objectClass })
}
