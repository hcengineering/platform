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
import {
  type MeasureContext,
  PersonId,
  Timestamp,
  TxCUD,
  TxFactory,
  TxOperations,
  TxProcessor,
  TxCreateDoc,
  TxUpdateDoc,
  AttachedData,
  Data
} from '@hcengineering/core'
import gmail, { type Message } from '@hcengineering/gmail'
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import core from '@hcengineering/core'
import attachment, { Attachment } from '@hcengineering/attachment'
import sanitizeHtml from 'sanitize-html'

import { IMessageManager } from '../types'
import { type Channel } from '../../types'
import { AttachmentHandler } from '../attachments'
import { decode64 } from '../../base64'
import { diffAttributes } from '../../utils'
import { SyncOptions } from '@hcengineering/mail-common'

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

export class MessageManagerV1 implements IMessageManager {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly client: TxOperations,
    private readonly attachmentHandler: AttachmentHandler,
    private readonly socialId: PersonId,
    private readonly workspace: { getChannel: (email: string) => Channel | undefined }
  ) {}

  private findChannels (res: AttachedData<Message>): Channel[] {
    const recievers = res.copy != null ? [res.to, ...res.copy] : [res.to]
    const values = res.incoming ? [res.from] : recievers
    const result: Channel[] = []
    for (const value of values) {
      const res = value.match(EMAIL_REGEX)
      if (res !== null) {
        const email = res[0]
        const channel = this.workspace.getChannel(email)
        if (channel !== undefined) result.push(channel)
      }
    }
    return result
  }

  async saveMessage (
    message: GaxiosResponse<gmail_v1.Schema$Message>,
    me: string,
    options?: SyncOptions
  ): Promise<void> {
    const res = convertMessage(message, me)
    const channels = this.findChannels(res)
    if (channels.length === 0) return
    const attachments = await this.attachmentHandler.getPartFiles(message.data.payload, message.data.id ?? '')
    const factory = new TxFactory(this.socialId)
    for (const channel of channels) {
      const current = await this.client.findOne(gmail.class.Message, {
        messageId: res.messageId,
        attachedTo: channel._id
      })
      const tx = current != null ? this.updateTx(res, current, factory, channel) : this.createTx(res, factory, channel)
      if (tx !== undefined) {
        const resultMessage =
          current != null
            ? TxProcessor.updateDoc2Doc(current, tx as TxUpdateDoc<Message>)
            : TxProcessor.createDoc2Doc(tx as TxCreateDoc<Message>)
        await this.client.tx(tx)
        if (attachments.length > 0) {
          const currentAttachemtns: Attachment[] =
            current !== undefined
              ? await this.client.findAll(attachment.class.Attachment, { attachedTo: current._id })
              : []
          for (const attachment of attachments) {
            await this.attachmentHandler.addAttachement(attachment, resultMessage, currentAttachemtns)
          }
        }
      }
    }
  }

  private createTx (
    message: AttachedData<Message> & { modifiedOn: Timestamp },
    factory: TxFactory,
    channel: Channel
  ): TxCUD<Message> {
    const tx = factory.createTxCollectionCUD<Channel, Message>(
      channel._class,
      channel._id,
      channel.space,
      'items',
      factory.createTxCreateDoc<Message>(
        gmail.class.Message,
        core.space.Workspace,
        message as unknown as Data<Message>,
        undefined,
        message.modifiedOn
      ),
      message.modifiedOn
    )
    return tx
  }

  private updateTx (
    message: AttachedData<Message> & { modifiedOn: Timestamp },
    current: Message,
    factory: TxFactory,
    channel: Channel
  ): TxCUD<Message> | undefined {
    const operations = diffAttributes(current, message)
    if (Object.keys(operations).length === 0) return undefined
    const tx = factory.createTxCollectionCUD<Channel, Message>(
      channel._class,
      channel._id,
      channel.space,
      'items',
      factory.createTxUpdateDoc<Message>(current._class, current.space, current._id, operations)
    )
    return tx
  }
}

function getHeaderValue (payload: gmail_v1.Schema$MessagePart | undefined, name: string): string | undefined {
  if (payload === undefined) return undefined
  const headers = payload.headers

  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined
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

function convertMessage (
  message: GaxiosResponse<gmail_v1.Schema$Message>,
  me: string
): AttachedData<Message> & { modifiedOn: Timestamp } {
  const date = message.data.internalDate != null ? new Date(Number.parseInt(message.data.internalDate)) : new Date()
  const from = getHeaderValue(message.data.payload, 'From') ?? ''
  const to = getHeaderValue(message.data.payload, 'To') ?? ''
  const copy =
    getHeaderValue(message.data.payload, 'Cc')
      ?.split(',')
      .map((p) => p.trim()) ?? undefined
  const incoming = !from.includes(me)
  return {
    modifiedOn: date.getTime(),
    messageId: getHeaderValue(message.data.payload, 'Message-ID') ?? '',
    replyTo: getHeaderValue(message.data.payload, 'In-Reply-To'),
    copy,
    content: sanitizeHtml(getPartMessage(message.data.payload, 'text/html')),
    textContent: sanitizeText(getPartMessage(message.data.payload, 'text/plain')),
    from,
    to,
    incoming,
    subject: getHeaderValue(message.data.payload, 'Subject') ?? '',
    sendOn: date.getTime()
  }
}
