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

import { AccountUuid, Ref } from '@hcengineering/core'
import { countTokens } from '@hcengineering/openai'
import { Tiktoken } from 'js-tiktoken'
import OpenAI from 'openai'

import { PersonMessage } from '@hcengineering/ai-bot'
import contact, { Contact } from '@hcengineering/contact'
import config from '../config'
import { HistoryRecord } from '../types'
import { WorkspaceClient } from '../workspace/workspaceClient'
import { getTools } from './tools'

export async function translateHtml (client: OpenAI, html: string, lang: string): Promise<string | undefined> {
  const response = await client.chat.completions.create({
    model: config.OpenAISummaryModel,
    messages: [
      {
        role: 'system',
        content: `Your task is to translate the text into ${lang} while preserving the html structure and metadata. Do not translate <span data-type="reference">`
      },
      {
        role: 'user',
        content: html
      }
    ]
  })

  return response.choices[0].message.content ?? undefined
}

export async function summarizeMessages (
  client: OpenAI,
  messages: PersonMessage[],
  lang: string
): Promise<string | undefined> {
  const personToName = new Map<Ref<Contact>, string>()
  for (const m of messages) {
    if (!personToName.has(m.personRef)) {
      personToName.set(m.personRef, m.personName)
    }
  }

  const nameUsage = new Map<string, number>()
  for (const [personRef, name] of personToName) {
    const idx = nameUsage.get(name) ?? 0
    if (idx > 0) {
      personToName.set(personRef, name + ` no.${idx}`)
    }
    nameUsage.set(name, idx + 1)
  }

  const text = messages.map((p) => '---\n\n@' + p.personName + '\n' + p.text).join('\n\n')

  const prompt = `Generate a summary from the provided sequence of messages by creating separate bullet lists for each participant, ensuring that each bullet point includes only the key points, problems and further work plans without any chit-chat, and clearly label each participant so that their individual contributions are distinctly summarized.
  Use following structure for output:
    **@Participant Name**
      - Key point 1
      - Key point 2
      - ...
    **@Participant Name**
      - Key point 1
      - ...
  Don't introduce any other elements of the structure.
  If a bullet point implies a reference to another participant include a reference according to this format: **@Participant Name**
  The response should be translated into ${lang} regardless of the original language. Don't translate the names of the participants and leave them exactly as they appear in the text.`

  const response = await client.chat.completions.create({
    model: config.OpenAIModel,
    messages: [
      {
        role: 'system',
        content: prompt
      },
      // We could also pack them into separate messages,
      // but for now it seems that this option is more preferable
      {
        role: 'user',
        content: text
      }
    ]
  })

  let responseText = response.choices[0].message.content ?? undefined
  if (responseText === undefined) return

  const classURI = encodeURIComponent(contact.class.Contact)
  for (const [personRef, name] of personToName) {
    const idURI = encodeURIComponent(personRef)
    const nameURI = encodeURIComponent(name)
    const refString = `[](ref://?_class=${classURI}&_id=${idURI}&label=${nameURI})`
    responseText = responseText.replaceAll(`**@${name}**`, refString)
  }

  return responseText
}

export async function createChatCompletion (
  client: OpenAI,
  message: OpenAI.ChatCompletionMessageParam,
  user?: string,
  history: OpenAI.ChatCompletionMessageParam[] = [],
  skipCache = true
): Promise<OpenAI.ChatCompletion | undefined> {
  const opt: OpenAI.RequestOptions = {}
  if (skipCache) {
    opt.headers = { 'cf-skip-cache': 'true' }
  }
  try {
    return await client.chat.completions.create(
      {
        messages: [...history, message],
        model: config.OpenAIModel,
        user,
        stream: false
      },
      opt
    )
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export async function createChatCompletionWithTools (
  workspaceClient: WorkspaceClient,
  client: OpenAI,
  message: OpenAI.ChatCompletionMessageParam,
  user?: AccountUuid,
  history: OpenAI.ChatCompletionMessageParam[] = [],
  skipCache = true
): Promise<
  | {
    completion: string | undefined
    usage: number
  }
  | undefined
  > {
  const opt: OpenAI.RequestOptions = {}
  if (skipCache) {
    opt.headers = { 'cf-skip-cache': 'true' }
  }
  try {
    const res = client.beta.chat.completions.runTools(
      {
        messages: [
          {
            role: 'system',
            content: 'Use tools if possible, don`t use previous information after success using tool for user request'
          },
          ...history,
          message
        ],
        model: config.OpenAIModel,
        user,
        tools: getTools(workspaceClient, user)
      },
      opt
    )
    const str = await res.finalContent()
    const usage = (await res.totalUsage()).completion_tokens
    return {
      completion: str ?? undefined,
      usage
    }
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export async function requestSummary (
  aiClient: OpenAI,
  encoding: Tiktoken,
  history: HistoryRecord[]
): Promise<{
    summary?: string
    tokens: number
  }> {
  const summaryPrompt: OpenAI.ChatCompletionMessageParam = {
    content: `Summarize the following messages, keeping the key points:  ${history.map((msg) => `${msg.role}: ${msg.message}`).join('\n')}`,
    role: 'user'
  }

  const response = await createChatCompletion(aiClient, summaryPrompt, undefined, [
    { role: 'system', content: 'Make a summary of messages history' }
  ])

  const summary = response?.choices[0].message.content

  if (summary == null) {
    return { tokens: 0 }
  }

  const tokens = response?.usage?.completion_tokens ?? countTokens([{ content: summary, role: 'assistant' }], encoding)

  return { summary, tokens }
}
