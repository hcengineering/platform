//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Client as IntercomcClient } from 'intercom-client'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import core, { Account, Client, Ref, TxOperations, getWorkspaceId } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import { updateSupportConversation } from '@hcengineering/support'

import config from './config'
import {
  IntercomConversationNotificationData,
  IntercomWebhookNotification,
  IntercomWebhookNotificationConverstaionAdminReplied,
  IntercomWebhookNotificationConverstaionRead
} from './types'

setMetadata(serverToken.metadata.Secret, config.ServerSecret)

/**
 * @public
 */
export function start (): () => void {
  console.log('Running Platform Intercom integration')

  const client = new IntercomcClient({ tokenAuth: { token: config.IntercomAuthToken } })
  client.useRequestOpts({
    baseURL: config.IntercomApiURL
  })

  const app = new Koa()
  const router = new Router()

  router.post('intercom', '/intercom', async (ctx): Promise<void> => {
    const payload = ctx.request.body as IntercomWebhookNotification

    if (payload.topic === 'conversation.admin.replied') {
      await notifyConversationAdminReply(client, payload)
    } else if (payload.topic === 'conversation.read') {
      await notifyConversationRead(client, payload)
    }

    ctx.body = {}
  })

  app.use(bodyParser())
  app.use(router.routes()).use(router.allowedMethods())

  const server = app.listen(config.Port)

  return () => {
    console.log('Stopping Platform Intercom integration')
    server.close()
  }
}

async function notifyConversationAdminReply (
  intercom: IntercomcClient,
  notification: IntercomWebhookNotificationConverstaionAdminReplied
): Promise<void> {
  await updateConversationStatus(intercom, notification.data.item, true)
}

async function notifyConversationRead (
  intercom: IntercomcClient,
  notification: IntercomWebhookNotificationConverstaionRead
): Promise<void> {
  await updateConversationStatus(intercom, notification.data.item, false)
}

async function updateConversationStatus (
  intercom: IntercomcClient,
  conversation: IntercomConversationNotificationData,
  unread: boolean
): Promise<void> {
  const contacts = conversation.contacts.contacts
  await Promise.all(
    Array.from(contacts).map(async (it) => {
      const contact = await intercom.contacts.find({ id: it.id })

      const accountId = contact.external_id ?? ''
      const workspaceId = (contact.custom_attributes.workspace as string) ?? ''
      const conversationId = it.id

      if (accountId !== '' && workspaceId !== '') {
        const client = await createPlatformClient(workspaceId)
        try {
          const tx = new TxOperations(client, core.account.System)
          await updateSupportConversation(tx, accountId as Ref<Account>, conversationId, unread)
        } catch (e) {
          console.error(e)
        } finally {
          await client.close()
        }
      }

      if (accountId === '') {
        console.warn('No account id specified for contact', contact.email)
      }

      if (workspaceId === '') {
        console.warn('No workspace specified for contact', contact.email)
      }
    })
  )
}

async function createPlatformClient (workspace: string): Promise<Client> {
  return await connect(config.TransactorURL, getWorkspaceId(workspace, config.ProductID), config.SystemEmail)
}
