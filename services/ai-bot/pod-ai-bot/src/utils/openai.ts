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

import { AccountUuid, MeasureContext, Ref, WorkspaceUuid } from '@hcengineering/core'
import { countTokens } from '@hcengineering/openai'
import { Tiktoken } from 'js-tiktoken'
import OpenAI from 'openai'

import { PersonMessage } from '@hcengineering/ai-bot'
import contact, { Contact } from '@hcengineering/contact'
import config from '../config'
import { HistoryRecord } from '../types'
import { WorkspaceClient } from '../workspace/workspaceClient'
import { getTools } from './tools'
import { pushTokensData } from '../billing'

export async function translateHtml (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  client: OpenAI,
  html: string,
  lang: string
): Promise<string | undefined> {
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

  const responseText = response.choices[0].message.content ?? undefined

  if (response.usage != null) {
    void pushTokensData(ctx, [
      {
        workspace,
        reason: 'manual-translate',
        tokens: response.usage.total_tokens,
        date: new Date(response.created * 1000).toISOString()
      }
    ])
  }

  return responseText
}

export async function summarizeMessages (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
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

  if (response.usage != null) {
    void pushTokensData(ctx, [
      {
        workspace,
        reason: 'summarize',
        tokens: response.usage.total_tokens,
        date: new Date(response.created * 1000).toISOString()
      }
    ])
  }

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
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  client: OpenAI,
  message: OpenAI.ChatCompletionMessageParam,
  user?: string,
  history: OpenAI.ChatCompletionMessageParam[] = [],
  skipCache = true,
  reason = 'chat'
): Promise<OpenAI.ChatCompletion | undefined> {
  const opt: OpenAI.RequestOptions = {}
  if (skipCache) {
    opt.headers = { 'cf-skip-cache': 'true' }
  }
  try {
    const response = await client.chat.completions.create(
      {
        messages: [...history, message],
        model: config.OpenAIModel,
        user,
        stream: false
      },
      opt
    )

    if (response.usage != null) {
      void pushTokensData(ctx, [
        {
          workspace,
          reason,
          tokens: response.usage.total_tokens,
          date: new Date(response.created * 1000).toISOString()
        }
      ])
    }

    return response
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export async function createChatCompletionWithTools (
  workspaceClient: WorkspaceClient,
  client: OpenAI,
  message: OpenAI.ChatCompletionMessageParam,
  contextMode: 'direct' | 'thread',
  assistantMemory: string,
  userMemory: string,
  sharedContext: string,
  user: AccountUuid,
  history: OpenAI.ChatCompletionMessageParam[] = [],
  skipCache = true,
  reason = 'chat'
): Promise<
  | {
    completion: string | undefined
    usage: number
  }
  | undefined
  > {
  const opt: OpenAI.RequestOptions = {}
  const date = new Date()
  if (skipCache) {
    opt.headers = { 'cf-skip-cache': 'true' }
  }
  try {
    const isDirectMode = contextMode === 'direct'

    const systemPrompt = isDirectMode
      ? `You are a helpful AI assistant, talking to user in direct chat.

**Your role:**
- Assist users with their questions and tasks
- Provide accurate, factual responses based only on available information
- Use available tools to help answer user requests
- Adapt your communication style to user preferences when explicitly specified

${assistantMemory !== '' ? `**Your persona and behavior:**\n${assistantMemory}\n` : ''}
${userMemory !== '' ? `**User preferences and context:**\n${userMemory}\n` : ''}
${sharedContext !== '' ? `**Shared preferences:**\n${sharedContext}\n` : ''}
**Available tools:**
- update_assistant_memory: Update information about assistant personality (name, behavior, etc.)
- update_user_memory: Update information about the user (preferences, context, personal info, how to address use in direct chats)
- update_shared_context: Update shared context (language, timezone, group chat preferences, how to address user in GROUP chats or general chats)
- get_assistant_memory: Check current information about yourself
- get_user_memory: Check current information about the user
- get_history_summary: Get a summary of past conversation (use this if you need context beyond recent messages)
- clear_assistant_memory / clear_user_memory / clear_history: Clear respective data

**Important context notes:**
- You only see the last ~20 messages in conversation history
- For context about older conversations, use get_history_summary tool
- This helps save tokens while maintaining conversation continuity

**Critical guidelines - ACCURACY FIRST:**
- ONLY use information explicitly provided in the conversation, context, or retrieved via tools
- If you don't have enough information to answer accurately, state this clearly
- NEVER invent, assume, or fabricate details not present in available data
- If uncertain about facts, explicitly say "I don't have information about this"
- Clearly distinguish between facts from context and any inferences you make
- Use memory tools when user shares important information about themselves or tells you how to behave
- Use get_history_summary if you need context about earlier parts of long conversations
- Keep responses precise and grounded in available data`
      : `You are a helpful AI assistant participating in a group conversation.

**Your role:**
- Assist all participants with their questions and tasks
- Provide accurate, factual responses based only on available information
- Contribute meaningfully to group discussions
- Stay on topic and maintain professional tone

${sharedContext !== '' ? `**Shared preferences:**\n${sharedContext}\n` : ''}
**Important - Group Chat Mode:**
- This is a shared conversation with multiple participants
- Do NOT use or reference any personal information about specific users
- Do NOT use memory tools (update_assistant_memory, update_user_memory, etc.)
- Treat all participants equally and professionally
- Keep responses neutral and avoid personalization
- Focus on the current discussion context only

**Critical guidelines - ACCURACY FIRST:**
- ONLY use information explicitly provided in the conversation or message history
- If you don't have enough information to answer accurately, state this clearly
- NEVER invent, assume, or fabricate details not present in the discussion
- If uncertain about facts, explicitly say "I don't have information about this"
- Clearly distinguish between facts from the conversation and any inferences
- Keep answers clear, concise, and grounded in available data
- Don't assume context or relationships not explicitly mentioned in messages`

    const res = client.beta.chat.completions.runTools(
      {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...history,
          message
        ],
        model: config.OpenAIModel,
        user,
        tools: getTools(workspaceClient, contextMode, user)
      },
      opt
    )

    const str = await res.finalContent()
    const usage = await res.totalUsage()

    if (usage != null) {
      void pushTokensData(workspaceClient.ctx, [
        {
          workspace: workspaceClient.wsIds.uuid,
          reason,
          tokens: usage.total_tokens,
          date: date.toISOString()
        }
      ])
    }

    return {
      completion: str ?? undefined,
      usage: usage.completion_tokens
    }
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export async function requestSummary (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  aiClient: OpenAI,
  encoding: Tiktoken,
  personMemory: string,
  history: HistoryRecord[]
): Promise<{
    summary?: string
    tokens: number
  }> {
  const summaryPrompt: OpenAI.ChatCompletionMessageParam = {
    content: `
      Create a factual, accurate summary of the conversation history based ONLY on what was actually discussed.

      **Summarization goals:**
      - Extract main topics, decisions, and action items EXACTLY as stated
      - Preserve factual information and specific details from messages
      - Keep critical facts that may be referenced later
      - Maintain chronological flow of events as they occurred
      - Record any user preferences or instructions explicitly provided
      - Remove only redundant repetitions, NOT important context

      **Critical - ACCURACY REQUIREMENTS:**
      - ONLY include information explicitly present in the conversation
      - DO NOT add interpretations, assumptions, or invented details
      - If something is unclear, note it as unclear rather than guessing
      - Preserve exact terminology and names used by participants
      - Keep factual statements separate from interpretations

      **Target compression:**
      - Compress messages into a compact but complete summary
      - Aim for maximum information density without losing facts
      - Prioritize factual accuracy over brevity
      - Keep summary under 1000 tokens

      Conversation entries:
        ${history.map((msg) => `${msg.role}: ${msg.message}`).join('\n')}
      `,
    role: 'user'
  }

  const response = await createChatCompletion(ctx, workspace, aiClient, summaryPrompt, undefined, [
    {
      role: 'system',
      content:
        'You are a conversation compression system. Create accurate, factual summaries that capture ONLY what was actually discussed. Do NOT add interpretations, assumptions, or invented details. Preserve exact facts, decisions, and context from the conversation. If information is unclear or missing, note this rather than guessing. Focus on maintaining factual accuracy and completeness of real information.'
    }
  ])

  const summary = response?.choices[0].message.content

  if (summary == null) {
    return { tokens: 0 }
  }

  const tokens = response?.usage?.completion_tokens ?? countTokens([{ content: summary, role: 'assistant' }], encoding)

  return { summary, tokens }
}
