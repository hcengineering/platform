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

import core, { Class, Doc, Markup, Ref, Tx, TxOperations, TxProcessor, TxUpdateDoc } from '@hcengineering/core'
import { WorkspaceClient } from './workspaceClient'
import analyticsCollector, { OnboardingChannel } from '@hcengineering/analytics-collector'
import aiBot from '@hcengineering/ai-bot'
import chunter, { ChatMessage, ThreadMessage } from '@hcengineering/chunter'
import { AIReplyTransferData } from '../types'
import { MarkupMarkType, MarkupNodeType } from '@hcengineering/text'

interface OnboardingChannelMetadata {
  workspace: string
  email: string
}

export class SupportWsClient extends WorkspaceClient {
  readonly disableAiRepliesChannels = new Map<Ref<OnboardingChannel>, OnboardingChannelMetadata>()
  readonly disableShowAiRepliesChannels = new Map<Ref<OnboardingChannel>, OnboardingChannelMetadata>()
  readonly assignedChannels = new Set<Ref<OnboardingChannel>>()

  async initClient (): Promise<TxOperations> {
    const client = await super.initClient()

    if (this.client != null) {
      this.client.notify = (...txes) => {
        this.handleTx(client, ...txes)
      }

      const channels = await client.findAll(analyticsCollector.class.OnboardingChannel, {})

      for (const channel of channels) {
        if (channel.members.length > 0) {
          this.assignedChannels.add(channel._id)
        }
        if (channel.disableAIReplies) {
          this.disableAiRepliesChannels.set(channel._id, { workspace: channel.workspaceId, email: channel.email })
        }
        if (!channel.showAIReplies) {
          this.disableShowAiRepliesChannels.set(channel._id, { workspace: channel.workspaceId, email: channel.email })
        }
        const key = `${channel.email}-${channel.workspaceId}`
        this.channelByKey.set(key, channel._id)
      }
    }

    return client
  }

  allowAiReplies (workspace: string, email: string): boolean {
    for (const [, { workspace: w, email: e }] of this.disableAiRepliesChannels) {
      if (w === workspace && e === email) {
        return false
      }
    }

    return true
  }

  private handleTx (client: TxOperations, ...txes: Tx[]): void {
    void super.txHandler(client, txes)
    for (const tx of txes) {
      const etx = TxProcessor.extractTx(tx)
      switch (etx._class) {
        case core.class.TxUpdateDoc: {
          this.txUpdateDoc(client, tx as TxUpdateDoc<Doc>)
          break
        }
      }
    }
  }

  private async updateChannels (tx: TxUpdateDoc<OnboardingChannel>): Promise<void> {
    if (this.client === undefined) return
    const updates = tx.operations

    if (updates.members !== undefined || updates.$push?.members !== undefined) {
      this.assignedChannels.add(tx.objectId)
    }

    if (updates.disableAIReplies === true) {
      const channel = await this.client.findOne(analyticsCollector.class.OnboardingChannel, { _id: tx.objectId })
      if (channel === undefined) return
      this.disableAiRepliesChannels.set(channel._id, { workspace: channel.workspaceId, email: channel.email })
    } else if (updates.disableAIReplies === false) {
      this.disableAiRepliesChannels.delete(tx.objectId)
    }
  }

  private txUpdateDoc (client: TxOperations, tx: TxUpdateDoc<Doc>): void {
    const hierarchy = client.getHierarchy()

    if (hierarchy.isDerived(tx.objectClass, analyticsCollector.class.OnboardingChannel)) {
      void this.updateChannels(tx as TxUpdateDoc<OnboardingChannel>)
    }
  }

  async transferAIReply (response: Markup, data: AIReplyTransferData): Promise<void> {
    const channel = this.getChannelRef(data.email, data.fromWorkspace)

    if (channel === undefined || this.disableShowAiRepliesChannels.has(channel)) return

    const client = await this.opClient
    const hierarchy = client.getHierarchy()

    const op = client.apply(undefined, 'AIBotSendAIReplyToSupport')

    const resp = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: MarkupNodeType.text, text: 'AI response:', marks: [{ type: MarkupMarkType.bold, attrs: {} }] }
          ]
        },
        {
          type: 'paragraph',
          content: JSON.parse(response).content
        }
      ]
    })

    if (hierarchy.isDerived(data.messageClass, chunter.class.ThreadMessage) && data.originalParent !== undefined) {
      const parent = await this.getThreadParent(
        client,
        data.originalParent,
        channel,
        analyticsCollector.class.OnboardingChannel
      )
      if (parent !== undefined) {
        const ref = await op.addCollection<Doc, ThreadMessage>(
          chunter.class.ThreadMessage,
          parent.space,
          parent._id,
          parent._class,
          'replies',
          { message: resp, objectId: parent.attachedTo, objectClass: parent.attachedToClass }
        )
        await op.createMixin(
          ref,
          chunter.class.ThreadMessage as Ref<Class<ChatMessage>>,
          channel,
          aiBot.mixin.TransferredMessage,
          {
            messageId: data.originalMessageId,
            parentMessageId: data.originalParent
          }
        )
      }
    } else {
      const ref = await op.addCollection<Doc, ChatMessage>(
        chunter.class.ChatMessage,
        channel,
        channel,
        analyticsCollector.class.OnboardingChannel,
        'messages',
        { message: resp }
      )

      await op.createMixin(ref, chunter.class.ChatMessage, channel, aiBot.mixin.TransferredMessage, {
        messageId: data.originalMessageId,
        parentMessageId: data.originalMessageId
      })
    }

    await op.commit()
  }
}
