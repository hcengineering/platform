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

import { MeasureContext, TxOperations } from '@hcengineering/core'
import { type KeyValueClient } from '@hcengineering/kvs-client'
import { AccountClient } from '@hcengineering/account-client'
import { type MailRecipient } from '@hcengineering/mail-common'

import config from '../config'
import { AttachmentHandler } from './attachments'
import { MessageManagerV2 } from './v2/message'
import { MessageManagerV1 } from './v1/message'
import { type IMessageManager } from './types'
import { type Channel } from '../types'

export function createMessageManager (
  ctx: MeasureContext,
  client: TxOperations,
  keyValueClient: KeyValueClient,
  accountClient: AccountClient,
  attachmentHandler: AttachmentHandler,
  workspace: { getChannel: (email: string) => Channel | undefined },
  token: string,
  recipient: MailRecipient
): IMessageManager {
  if (config.Version === 'v2') {
    return new MessageManagerV2(ctx, attachmentHandler, client, keyValueClient, accountClient, token, recipient)
  } else {
    return new MessageManagerV1(ctx, client, attachmentHandler, recipient.socialId, workspace)
  }
}
