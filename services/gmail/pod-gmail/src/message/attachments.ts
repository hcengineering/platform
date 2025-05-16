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
import { randomUUID } from 'crypto'
import attachment, { Attachment } from '@hcengineering/attachment'
import { Blob, MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { type Attachment as AttachedFile } from '@hcengineering/mail-common'
import { gmail_v1 } from 'googleapis'
import { WorkspaceLoginInfo } from '@hcengineering/account-client'

import { encode64 } from '../base64'
import { addFooter } from '../utils'

export class AttachmentHandler {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly wsInfo: WorkspaceLoginInfo,
    private readonly storageAdapter: StorageAdapter,
    private readonly gmail: gmail_v1.Resource$Users,
    private readonly client: TxOperations
  ) {}

  async addAttachement (file: AttachedFile, message: any, currentAttachemtns: Attachment[]): Promise<void> {
    try {
      if (currentAttachemtns.findIndex((p) => p.name === file.name && p.lastModified === file.lastModified) !== -1) {
        return
      }
      const fileId = file.id ?? randomUUID()
      await this.storageAdapter.put(
        this.ctx,
        {
          uuid: this.wsInfo.workspace,
          url: this.wsInfo.workspaceUrl,
          dataId: this.wsInfo.workspaceDataId
        },
        fileId,
        file.data,
        file.contentType,
        file.size
      )
      await this.client.addCollection(
        attachment.class.Attachment,
        message.space,
        message._id,
        message._class,
        'attachments',
        {
          name: file.name,
          file: fileId as Ref<Blob>,
          type: file.data.toString('base64') ?? 'undefined',
          size: file.size ?? file.data.length,
          lastModified: file.lastModified ?? Date.now()
        }
      )
    } catch (err: any) {
      this.ctx.error('Add attachment error', { error: err.message })
    }
  }

  async getPartFiles (part: gmail_v1.Schema$MessagePart | undefined, messageId: string): Promise<AttachedFile[]> {
    if (part === undefined) return []
    if (part.filename != null && part.filename.length > 0) {
      if (part.body?.attachmentId != null) {
        const attachment = await this.getAttachmentById(part.body?.attachmentId, messageId)
        if (attachment.data == null) return []
        return [
          {
            id: randomUUID(),
            name: part.filename,
            data: Buffer.from(attachment.data, 'base64'),
            contentType: part.mimeType ?? 'application/octet-stream',
            size: attachment.size ?? undefined,
            lastModified: new Date().getTime()
          }
        ]
      }
      if (part.body?.data == null) return []
      return [
        {
          id: randomUUID(),
          data: Buffer.from(part.body.data, 'base64'),
          name: part.filename,
          contentType: part.mimeType ?? 'application/octet-stream',
          size: part.body.size ?? undefined,
          lastModified: new Date().getTime()
        }
      ]
    }
    return await this.getPartsFiles(part.parts, messageId)
  }

  private async getAttachmentById (attachmentId: string, messageId: string): Promise<gmail_v1.Schema$MessagePartBody> {
    const res = await this.gmail.messages.attachments.get({ id: attachmentId, userId: 'me', messageId })
    return res.data
  }

  private async getPartsFiles (
    parts: gmail_v1.Schema$MessagePart[] | undefined,
    messageId: string
  ): Promise<AttachedFile[]> {
    const result: AttachedFile[] = []
    if (parts !== undefined) {
      const filtredParts = parts.filter((part) => part.filename != null && part.filename.length > 0)
      for (const part of filtredParts ?? []) {
        const res = await this.getPartFiles(part, messageId)
        if (res.length > 0) {
          result.push(...res)
        }
      }
    }
    return result
  }

  async makeAttachmentsBody (message: any, from: string): Promise<string> {
    const str = [
      'Content-Type: multipart/mixed; boundary="mail"\n',
      'MIME-Version: 1.0\n',
      `To: ${message.to} \n`,
      `From: ${from} \n`
    ]

    if (message.replyTo != null) {
      str.push(`In-Reply-To: ${message.replyTo} \n`)
    }

    if (message.copy != null && message.copy.length > 0) {
      str.push(`Cc: ${message.copy.join(', ')} \n`)
    }

    if (message.subject != null) {
      str.push(`Subject: =?UTF-8?B?${encode64(message.subject)}?= \n`)
    }

    str.push('\n\n')
    str.push('--mail\n')
    str.push('Content-Type: text/html; charset="UTF-8"\n')
    str.push('MIME-Version: 1.0\n')
    str.push('Content-Transfer-Encoding: 7bit\n\n')
    str.push(addFooter(message.content))
    str.push('\n\n')

    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: message._id })

    for (const attachment of attachments) {
      const attachmentStrings = await this.makeAttachmentPart(attachment)
      str.push(...attachmentStrings)
    }

    str.push('--mail--')

    return encode64(str.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private async makeAttachmentPart (attachment: Attachment): Promise<string[]> {
    try {
      const buffer = await this.storageAdapter.read(
        this.ctx,
        {
          uuid: this.wsInfo.workspace,
          url: this.wsInfo.workspaceUrl,
          dataId: this.wsInfo.workspaceDataId
        },
        attachment.file
      )
      const data = Buffer.concat(buffer.map((b) => new Uint8Array(b))).toString('base64')
      const res: string[] = []
      res.push('--mail\n')
      res.push(`Content-Type: ${attachment.type}\n`)
      res.push('MIME-Version: 1.0\n')
      res.push('Content-Transfer-Encoding: base64\n')
      res.push(`Content-Disposition: attachment; filename="${attachment.name}"\n\n`)
      res.push(data)
      res.push('\n\n')
      return res
    } catch (err: any) {
      this.ctx.error('Failed to make attachment part', {
        error: err.message,
        file: attachment.file,
        name: attachment.name
      })
      return []
    }
  }
}
