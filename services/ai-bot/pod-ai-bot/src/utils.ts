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

import core, { Account, Ref, TxOperations } from '@hcengineering/core'
import contact, { PersonAccount } from '@hcengineering/contact'
import aiBot from '@hcengineering/ai-bot'
import { loginBot } from './account'
import chunter, { DirectMessage } from '@hcengineering/chunter'
import { deepEqual } from 'fast-equals'
import notification from '@hcengineering/notification'
import OpenAI from 'openai'
import { countTokens } from '@hcengineering/openai'
import { Tiktoken } from 'tiktoken'

import { HistoryRecord } from './types'
import config from './config'

export async function login (): Promise<string | undefined> {
  const token = (await loginBot())?.token

  if (token !== undefined) {
    return token
  } else {
    return (await loginBot())?.token
  }
}

export async function getDirect (
  client: TxOperations,
  email: string,
  aiAccount?: PersonAccount
): Promise<Ref<DirectMessage> | undefined> {
  const personAccount = await client.getModel().findOne(contact.class.PersonAccount, { email })

  if (personAccount === undefined) {
    return
  }

  const allAccounts = await client.findAll(contact.class.PersonAccount, { person: personAccount.person })
  const accIds: Ref<Account>[] = [aiBot.account.AIBot, ...allAccounts.map(({ _id }) => _id)].sort()
  const existingDms = await client.findAll(chunter.class.DirectMessage, {})

  for (const dm of existingDms) {
    if (deepEqual(dm.members.sort(), accIds)) {
      return dm._id
    }
  }

  const dmId = await client.createDoc<DirectMessage>(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: accIds
  })

  if (aiAccount === undefined) return dmId
  const space = await client.findOne(contact.class.PersonSpace, { person: aiAccount.person })
  if (space === undefined) return dmId
  await client.createDoc(notification.class.DocNotifyContext, space._id, {
    user: aiBot.account.AIBot,
    objectId: dmId,
    objectClass: chunter.class.DirectMessage,
    objectSpace: core.space.Space,
    isPinned: false,
    hidden: false
  })

  return dmId
}

export async function createChatCompletion (
  client: OpenAI,
  message: OpenAI.ChatCompletionMessageParam,
  user?: string,
  history: OpenAI.ChatCompletionMessageParam[] = []
): Promise<OpenAI.ChatCompletion | undefined> {
  try {
    return await client.chat.completions.create({
      messages: [...history, message],
      model: config.OpenAIModel,
      user,
      stream: false
    })
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
