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
import { PlatformQueue } from '@hcengineering/server-core'
import { MessageEventType, TranslateMessageEvent } from '@hcengineering/communication-sdk-types'

import { Storage } from './storage'
import config from './config'

export class Controller {
  private readonly languagesByWorkspace = new Map<WorkspaceUuid, string[]>()
  private readonly storage: Storage
  private readonly endpoints = new Map<WorkspaceUuid, string>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly openai: OpenAI,
    private readonly queue: PlatformQueue
  ) {
    this.storage = new Storage(this.ctx)
  }

  public processTx (workspace: WorkspaceUuid, tx: Tx): void {
    if (!this.languagesByWorkspace.has(workspace)) return
    this.processTranslation(workspace, tx)
  }

  private processTranslation (workspace: WorkspaceUuid, tx: Tx): void {
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

  async processMessageCreate (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    message: Message,
    blobId: BlobID
  ): Promise<void> {
    const translateTo = (await this.getLanguages(workspace)).filter((it) => it !== message.language)
    if (translateTo.length === 0) return
    console.log('translateTo', translateTo)
    console.log('message', message.content, message.language)

    for (const lang of translateTo) {
      try {
        const result = await withRetry(() => this.translate(message.content, lang))

        if (result !== '') {
          await this.storage.insertMessage(workspace, message.cardId, blobId, lang, message, result)
          const event: TranslateMessageEvent = {
            type: MessageEventType.TranslateMessage,
            cardId: message.cardId,
            messageId: message.id,
            content: result,
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
          const client = await this.getRestClient(workspace)
          await client.tx(tx)
        }
      } catch (e) {
        ctx.error('Failed to translate message', { error: e, messageId: message.id })
        Analytics.handleError(e as Error)
      }
    }
  }

  async processMessageUpdate (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    cardId: CardID,
    messageId: MessageID,
    content: Markdown,
    blobId: BlobID
  ): Promise<void> {
    const translateTo = await this.getLanguages(workspace)
    if (translateTo.length === 0) return

    for (const lang of translateTo) {
      try {
        const result = await withRetry(() => this.translate(content, lang))

        if (result !== '') {
          await this.storage.updateMessage(workspace, cardId, blobId, messageId, lang, result)
          const event: TranslateMessageEvent = {
            type: MessageEventType.TranslateMessage,
            cardId,
            messageId,
            content: result,
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
          const client = await this.getRestClient(workspace)
          await client.tx(tx)
        }
      } catch (e) {
        ctx.error('Failed to update message translation', { error: e, messageId })
        Analytics.handleError(e as Error)
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

  private async translate (markdown: string, lang: string): Promise<string> {
    const response = await this.openai.responses.create({
      model: config.OpenAIModel,
      instructions: `You are a translation model.Your only task is to translate the given markdown text into the ${lang} language.
Output only the translation, nothing else. Do not add explanations, comments, or formatting.Preserve names and terms if they have no clear equivalent. Be as literal and accurate as possible while keeping the meaning natural.`,
      input: markdown
    })

    return response?.output_text?.trim() ?? ''
  }
}
