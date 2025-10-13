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
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import sanitizeHtml from 'sanitize-html'

import { type MeasureContext, TxOperations } from '@hcengineering/core'
import {
  createMessages,
  parseEmailHeader,
  parseNameFromEmailHeader,
  EmailMessage,
  getProducer,
  MailRecipient,
  getMessageExtra,
  MailHeader,
  SyncOptions
} from '@hcengineering/mail-common'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { AccountClient, isWorkspaceLoginInfo, WorkspaceLoginInfo } from '@hcengineering/account-client'

import { IMessageManager } from '../types'
import config from '../../config'
import { AttachmentHandler } from '../attachments'
import { decode64 } from '../../base64'
import { GmailMessageType } from '../../types'

export class MessageManagerV2 implements IMessageManager {
  private wsInfo: WorkspaceLoginInfo | undefined = undefined
  constructor (
    private readonly ctx: MeasureContext,
    private readonly attachmentHandler: AttachmentHandler,
    private readonly txClient: TxOperations,
    private readonly keyValueClient: KeyValueClient,
    private readonly accountClient: AccountClient,
    private readonly token: string,
    private readonly recipient: MailRecipient
  ) {}

  async saveMessage (
    message: GaxiosResponse<gmail_v1.Schema$Message>,
    me: string,
    options?: SyncOptions
  ): Promise<void> {
    if (isHulyMessage(message.data.payload)) {
      this.ctx.info('Skipping Huly message', { mailId: message.data.id, me })
      return
    }
    const res = convertMessage(message, me)
    const attachments = await this.attachmentHandler.getPartFiles(message.data.payload, message.data.id ?? '')

    if (this.wsInfo === undefined) {
      const workspaceInfo = await this.accountClient.getLoginInfoByToken()
      if (!isWorkspaceLoginInfo(workspaceInfo)) {
        this.ctx.error('Unable to get workspace info', { mailId: res.mailId, from: res.from })
        return
      }
      this.wsInfo = workspaceInfo
    }

    await createMessages(
      config,
      this.ctx,
      this.txClient,
      this.keyValueClient,
      await getProducer(config.CommunicationTopic),
      this.token,
      this.wsInfo,
      res,
      attachments,
      [this.recipient],
      options
    )
  }
}

function getHeaderValue (payload: gmail_v1.Schema$MessagePart | undefined, name: string): string | undefined {
  if (payload === undefined) return undefined
  const headers = payload.headers

  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined
}

export function isHulyMessage (payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  const hulyHeader = getHeaderValue(payload, MailHeader.HulySent)
  if (hulyHeader !== undefined) {
    return true
  }
  const hulyMessage = getHeaderValue(payload, MailHeader.HulyMessageType)
  return hulyMessage !== undefined
}

function getPartsMessage (parts: gmail_v1.Schema$MessagePart[] | undefined, mime: string): string {
  let result = ''
  if (parts !== undefined) {
    const htmlPart = parts.find((part) => part.mimeType === mime)
    const filtredParts = htmlPart !== undefined ? parts.filter((part) => part.mimeType === mime) : parts
    for (const part of filtredParts ?? []) {
      result += getPartMessage(part, mime)
    }
  }
  return result
}

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {}
}

export function sanitizeText (input: string): string {
  if (input == null) return ''
  return sanitizeHtml(input, sanitizeOptions)
}

function getPartMessage (part: gmail_v1.Schema$MessagePart | undefined, mime: string): string {
  if (part === undefined) return ''
  if (part.body?.data != null) {
    return decode64(part.body.data)
  }
  return getPartsMessage(part.parts, mime)
}

function convertMessage (message: GaxiosResponse<gmail_v1.Schema$Message>, me: string): EmailMessage {
  const date = message.data.internalDate != null ? new Date(Number.parseInt(message.data.internalDate)) : new Date()
  const from = parseNameFromEmailHeader(getHeaderValue(message.data.payload, 'From') ?? '')
  const to = parseEmailHeader(getHeaderValue(message.data.payload, 'To') ?? '')

  const copy = parseEmailHeader(getHeaderValue(message.data.payload, 'Cc') ?? '')
  const incoming = !from.email.includes(me)
  return {
    modifiedOn: date.getTime(),
    mailId: getHeaderValue(message.data.payload, 'Message-ID') ?? '',
    replyTo: getHeaderValue(message.data.payload, 'In-Reply-To'),
    copy,
    content: sanitizeHtml(getPartMessage(message.data.payload, 'text/html')),
    textContent: sanitizeText(getPartMessage(message.data.payload, 'text/plain')),
    from,
    to,
    incoming,
    subject: getHeaderValue(message.data.payload, 'Subject') ?? '',
    sendOn: date.getTime(),
    extra: getMessageExtra(GmailMessageType, true)
  }
}
