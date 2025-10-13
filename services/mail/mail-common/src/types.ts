//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import { Card } from '@hcengineering/card'
import { MessageExtra } from '@hcengineering/communication-types'
import { OperationDomain, PersonId, PersonUuid, Ref, Space, WorkspaceUuid } from '@hcengineering/core'

//
export interface Attachment {
  id: string
  name: string
  data: Buffer
  contentType: string
  size?: number
  lastModified?: number
}

export interface EmailContact {
  email: string
  firstName: string
  lastName: string
}

export interface EmailMessage {
  modifiedOn: number
  mailId: string
  replyTo?: string
  copy?: EmailContact[]
  content: string
  textContent: string
  from: EmailContact
  to: EmailContact[]
  incoming: boolean
  subject: string
  sendOn: number
  extra?: MessageExtra
}

export interface MailRecipient {
  email: string
  uuid: PersonUuid
  socialId: PersonId
}

export interface BaseConfig {
  AccountsURL: string
  KvsUrl: string
  StorageConfig: string
  QueueConfig: string
  QueueRegion: string
  CommunicationTopic: string
}

export interface MessageData {
  subject: string
  from: string
  content: string
  channel: Ref<Card>
  created: Date
  modifiedBy: PersonId
  mailId: string
  spaceId: Ref<Space>
  workspace: WorkspaceUuid
  threadId: Ref<Card>
  recipient: MailRecipient
  isReply: boolean
  extra?: MessageExtra
}

export interface SyncOptions {
  noNotify?: boolean
  spaceId?: Ref<Space>
}

export interface MailRecipients {
  to: string
  copy?: string[]
}

export const COMMUNICATION_DOMAIN = 'communication' as OperationDomain

export const HulyMailHeader = 'Huly-Sent'
export const HulyMessageIdHeader = 'Huly-Message-Id'
export const HulyMessageTypeHeader = 'Huly-Message-Type'

export enum MailHeader {
  Id = 'Message-ID',
  InReplyTo = 'In-Reply-To',
  Subject = 'Subject',
  From = 'From',
  To = 'To',
  HulySent = 'Huly-Sent',
  HulyMessageType = 'Huly-Message-Type'
}
