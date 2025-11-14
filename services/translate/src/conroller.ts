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

import core, {
  Doc,
  Domain,
  generateId,
  MeasureContext,
  notEmpty,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxDomainEvent,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceUuid
} from '@hcengineering/core'
import { createRestClient, RestClient } from '@hcengineering/api-client'
import { generateToken } from '@hcengineering/server-token'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import contact, { Translation } from '@hcengineering/contact'
import { BlobID, CardID, Markdown, Message, MessageID } from '@hcengineering/communication-types'
import { withRetry } from '@hcengineering/retry'
import { Analytics } from '@hcengineering/analytics'
import OpenAI from 'openai'
import { MessageEventType, TranslateMessageEvent, UpdatePatchEvent } from '@hcengineering/communication-sdk-types'

import { Storage } from './storage'
import config from './config'
import { pushTokensData } from './billing'

export class Controller {
  private readonly languagesByWorkspace = new Map<WorkspaceUuid, string[]>()
  private readonly storage: Storage
  private readonly endpoints = new Map<WorkspaceUuid, string>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly openai: OpenAI
  ) {
    this.storage = new Storage(this.ctx)
  }

  public processTranslationSettingsTx (workspace: WorkspaceUuid, tx: Tx): void {
    if (!this.languagesByWorkspace.has(workspace)) return
    this.processTranslationSettings(workspace, tx)
  }

  private processTranslationSettings (workspace: WorkspaceUuid, tx: Tx): void {
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass !== contact.class.Translation) return
      const translation = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Translation>)
      if (translation.translateTo != null && translation.translateTo !== '') {
        const langs = this.languagesByWorkspace.get(workspace) ?? []
        if (!langs.includes(translation.translateTo)) {
          langs.push(translation.translateTo)
          this.languagesByWorkspace.set(workspace, langs)
        }
      }
    }

    if (tx._class === core.class.TxUpdateDoc) {
      const updateTx = tx as TxUpdateDoc<Translation>
      if (updateTx.objectClass !== contact.class.Translation) return
      if (updateTx.operations.translateTo == null || updateTx.operations.translateTo === '') return
      const langs = this.languagesByWorkspace.get(workspace) ?? []
      if (!langs.includes(updateTx.operations.translateTo)) {
        langs.push(updateTx.operations.translateTo)
        this.languagesByWorkspace.set(workspace, langs)
      }
    }
  }

  private async getRestClient (workspace: WorkspaceUuid): Promise<RestClient> {
    const token = generateToken(systemAccountUuid, workspace, { service: config.ServiceId })
    const endpoint = this.endpoints.get(workspace) ?? (await getTransactorEndpoint(token))
    if (endpoint != null && endpoint !== '') {
      this.endpoints.set(workspace, endpoint)
    }
    return createRestClient(endpoint, workspace, token)
  }

  public async getLanguages (workspace: WorkspaceUuid): Promise<string[]> {
    if (this.languagesByWorkspace.has(workspace)) {
      return this.languagesByWorkspace.get(workspace) ?? []
    }

    const client = await this.getRestClient(workspace)
    const translations = await client.findAll(contact.class.Translation, {})

    const languages = new Set(
      translations
        .map((it) => it.translateTo)
        .filter(notEmpty)
        .filter((it) => it !== '')
    )
    const arrayLangs = Array.from(languages)
    this.languagesByWorkspace.set(workspace, arrayLangs)
    return arrayLangs
  }

  private getUpdateLanguageTx (cardId: CardID, messageId: MessageID, language: string): TxDomainEvent {
    const event: UpdatePatchEvent = {
      type: MessageEventType.UpdatePatch,
      cardId,
      messageId,
      language,
      socialId: core.account.System
    }

    return {
      _id: generateId(),
      _class: core.class.TxDomainEvent,
      space: core.space.Tx,
      objectSpace: core.space.Workspace,
      modifiedOn: Date.now(),
      modifiedBy: core.account.System,
      domain: 'communication' as Domain,
      event
    }
  }

  async processMessageCreate (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    message: Message,
    blobId: BlobID
  ): Promise<void> {
    const initialLanguage = message.language

    const translateTo = await this.getLanguages(workspace)
    if (translateTo.length === 0) return

    let originalLanguage = initialLanguage

    const txes: Tx[] = []
    for (const lang of translateTo) {
      try {
        const result = await withRetry(() => this.translate(workspace, message.content, lang))
        if (result == null) continue
        const translation = result?.translation ?? ''

        if (result?.original_language != null && result.original_language !== '') {
          originalLanguage = result.original_language
        }
        if (translation !== '') {
          await this.storage.insertMessage(workspace, message.cardId, blobId, lang, message, translation)
          const event: TranslateMessageEvent = {
            type: MessageEventType.TranslateMessage,
            cardId: message.cardId,
            messageId: message.id,
            content: translation,
            language: lang
          }

          const tx: TxDomainEvent = {
            _id: generateId(),
            _class: core.class.TxDomainEvent,
            space: core.space.Tx,
            objectSpace: core.space.Workspace,
            modifiedOn: Date.now(),
            modifiedBy: core.account.System,
            domain: 'communication' as Domain,
            event
          }
          txes.push(tx)
        }
      } catch (e) {
        ctx.error('Failed to translate message', { error: e, messageId: message.id })
        Analytics.handleError(e as Error)
      }
    }

    if (originalLanguage != null && originalLanguage !== '' && originalLanguage !== initialLanguage) {
      ctx.info('update original language', { originalLanguage, id: message.id, content: message.content.slice(0, 50) })
      txes.unshift(this.getUpdateLanguageTx(message.cardId, message.id, originalLanguage))
    }

    if (txes.length > 0) {
      const client = await this.getRestClient(workspace)
      for (const tx of txes) {
        await client.tx(tx)
      }
    }
  }

  async processMessageUpdate (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    cardId: CardID,
    messageId: MessageID,
    content: Markdown,
    blobId: BlobID,
    language?: string
  ): Promise<void> {
    const translateTo = await this.getLanguages(workspace)
    if (translateTo.length === 0) return
    const txes: Tx[] = []

    let originalLanguage = language

    for (const lang of translateTo) {
      try {
        const result = await withRetry(() => this.translate(workspace, content, lang))
        if (result == null) continue
        const translation = result?.translation ?? ''
        if (result?.original_language != null && result.original_language !== '') {
          originalLanguage = result.original_language
        }
        if (translation !== '') {
          await this.storage.updateMessage(workspace, cardId, blobId, messageId, lang, translation)
          const event: TranslateMessageEvent = {
            type: MessageEventType.TranslateMessage,
            cardId,
            messageId,
            content: translation,
            language: lang
          }
          const tx: TxDomainEvent = {
            _id: generateId(),
            _class: core.class.TxDomainEvent,
            space: core.space.Tx,
            objectSpace: core.space.Workspace,
            modifiedOn: Date.now(),
            modifiedBy: core.account.System,
            domain: 'communication' as Domain,
            event
          }

          txes.push(tx)
        }
      } catch (e) {
        ctx.error('Failed to update message translation', { error: e, messageId })
        Analytics.handleError(e as Error)
      }
    }

    if (originalLanguage != null && originalLanguage !== '' && originalLanguage !== language) {
      txes.unshift(this.getUpdateLanguageTx(cardId, messageId, originalLanguage))
    }

    if (txes.length > 0) {
      const client = await this.getRestClient(workspace)
      for (const tx of txes) {
        await client.tx(tx)
      }
    }
  }

  async processMessageRemove (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    cardId: CardID,
    messageId: MessageID,
    blobId: BlobID
  ): Promise<void> {
    const translateTo = await this.getLanguages(workspace)
    if (translateTo.length === 0) return

    for (const lang of translateTo) {
      try {
        await this.storage.removeMessage(workspace, cardId, blobId, messageId, lang)
      } catch (e) {
        ctx.error('Failed to translate message', { error: e, messageId })
        Analytics.handleError(e as Error)
      }
    }
  }

  private async translate (
    workspace: WorkspaceUuid,
    markdown: string,
    lang: string
  ): Promise<{ original_language?: string, translation?: string } | undefined> {
    const systemPrompt = `
You are a translation model.
Your only task is to translate the given Markdown text into the ${lang} language.
Detect the original language of the input.
If the input Markdown is already written in ${lang}, do not translate.
Preserve names and terms if they have no clear equivalent.
Be as literal and accurate as possible while keeping the meaning natural.
Keep the Markdown structure.
Output the result strictly as a JSON object in the following format:
{
  "original_language": "<detected language in iso 639-1>",
  "translation": "<translated markdown or empty string if no translation was needed>"
}
Do not add any explanations, comments, or extra text outside the JSON.
`.trim()

    const response = await this.openai.chat.completions.create({
      model: config.OpenAIModel,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: markdown
        }
      ]
    })

    if (response.usage != null) {
      void pushTokensData(this.ctx, [
        {
          workspace,
          reason: 'auto-translate',
          tokens: response.usage.total_tokens,
          date: new Date(response.created * 1000).toISOString()
        }
      ])
    }

    const res = response.choices[0]?.message.content ?? ''

    try {
      const parsed = JSON.parse(res)
      if (typeof parsed !== 'object' || parsed === null) {
        console.error('Failed to parse translation response', { response: res })
        return undefined
      }
      return parsed
    } catch (e) {
      console.error('Failed to parse translation response', { response: res, error: e })
      return undefined
    }
  }
}
