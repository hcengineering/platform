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

import { Client, getWorkspaceId, systemAccountEmail, TxFactory, WorkspaceId } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import notification, { ActivityInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import chunter, { ThreadMessage } from '@hcengineering/chunter'
import contact, { PersonAccount } from '@hcengineering/contact'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import activity, { ActivityMessage } from '@hcengineering/activity'

import { NotificationRecord } from './types'

export class WorkspaceClient {
  private constructor (
    private readonly client: Client,
    private readonly token: string,
    private readonly workspace: WorkspaceId
  ) {}

  static async create (workspace: string): Promise<WorkspaceClient> {
    const workspaceId = getWorkspaceId(workspace)
    const token = generateToken(systemAccountEmail, workspaceId)
    const client = await connectPlatform(token)

    return new WorkspaceClient(client, token, workspaceId)
  }

  async replyToMessage (message: ActivityMessage, account: PersonAccount, text: string): Promise<void> {
    const txFactory = new TxFactory(account._id)
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
      const thread = message as ThreadMessage
      const collectionTx = txFactory.createTxCollectionCUD(
        thread.attachedToClass,
        thread.attachedTo,
        message.space,
        'replies',
        txFactory.createTxCreateDoc(chunter.class.ThreadMessage, message.space, {
          attachedTo: thread.attachedTo,
          attachedToClass: thread.attachedToClass,
          objectId: thread.objectId,
          objectClass: thread.objectClass,
          message: text,
          attachments: 0,
          collection: 'replies',
          provider: contact.channelProvider.Telegram
        })
      )
      await this.client.tx(collectionTx)
    } else {
      const collectionTx = txFactory.createTxCollectionCUD(
        message._class,
        message._id,
        message.space,
        'replies',
        txFactory.createTxCreateDoc(chunter.class.ThreadMessage, message.space, {
          attachedTo: message._id,
          attachedToClass: message._class,
          objectId: message.attachedTo,
          objectClass: message.attachedToClass,
          message: text,
          attachments: 0,
          collection: 'replies',
          provider: contact.channelProvider.Telegram
        })
      )
      await this.client.tx(collectionTx)
    }
  }

  async replyToActivityNotification (
    it: ActivityInboxNotification,
    account: PersonAccount,
    text: string
  ): Promise<boolean> {
    const message = await this.client.findOne(it.attachedToClass, { _id: it.attachedTo })

    if (message !== undefined) {
      await this.replyToMessage(message, account, text)
      return true
    }

    return false
  }

  async replyToMention (it: MentionInboxNotification, account: PersonAccount, text: string): Promise<boolean> {
    const hierarchy = this.client.getHierarchy()

    if (!hierarchy.isDerived(it.mentionedInClass, activity.class.ActivityMessage)) {
      return false
    }

    const message = (await this.client.findOne(it.mentionedInClass, { _id: it.mentionedIn })) as ActivityMessage

    if (message !== undefined) {
      await this.replyToMessage(message, account, text)
      return true
    }

    return false
  }

  public async reply (record: NotificationRecord, text: string): Promise<boolean> {
    const account = await this.client.getModel().findOne(contact.class.PersonAccount, { email: record.email })
    if (account === undefined) {
      return false
    }

    const inboxNotification = await this.client.findOne(notification.class.InboxNotification, {
      _id: record.notificationId
    })

    if (inboxNotification === undefined) {
      return false
    }
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(inboxNotification._class, notification.class.ActivityInboxNotification)) {
      return await this.replyToActivityNotification(inboxNotification as ActivityInboxNotification, account, text)
    } else if (hierarchy.isDerived(inboxNotification._class, notification.class.MentionInboxNotification)) {
      return await this.replyToMention(inboxNotification as MentionInboxNotification, account, text)
    }

    return false
  }

  async close (): Promise<void> {
    await this.client.close()
  }
}

async function connectPlatform (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}
