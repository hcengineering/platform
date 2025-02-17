<!--
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
-->
<script lang="ts">
  import core, { Data, Doc, generateId, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import chunter, { type ChatMessage } from '@hcengineering/chunter'
  import { Card, getClient, isSpace } from '@hcengineering/presentation'
  import { MailThread } from '@hcengineering/mail'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import mail from '../plugin'
  import { isValidEmail } from '../messageUtils'

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const client = getClient()
  const account = getCurrentAccount()

  export let mailThreadId: Ref<MailThread> | undefined = undefined

  export let to = ''
  export let from = getEmail()
  export let subject = ''
  let message = ''

  export function canClose (): boolean {
    return to === '' && from === '' && subject === ''
  }

  export function getEmail (): string {
    // TODO: use email from account
    return 'test@huly.me'
  }

  async function createMail (): Promise<void> {
    const mailThread = await getOrCreateMailThread()
    if (mailThread === undefined) {
      throw new Error('Failed to create mail thread')
    }

    const messageId: Ref<ChatMessage> = await client.addCollection<Doc, ChatMessage>(
      chunter.class.ChatMessage,
      getSpace(mailThread),
      mailThread._id,
      mail.class.MailThread,
      'messages',
      { message: message ?? '' }
    )

    dispatch('close', messageId)
  }

  async function getOrCreateMailThread (): Promise<MailThread | undefined> {
    if (mailThreadId !== undefined) {
      const mailThread = await client.findOne(mail.class.MailThread, { mailThreadId: mailThreadId as any })
      if (mailThread !== undefined) {
        return mailThread
      }
    }
    const data: Data<MailThread> = {
      mailThreadId: generateId(),
      from,
      to,
      subject,
      name: subject,
      description: '',
      private: true,
      members: [account.primarySocialId],
      archived: false,
      preview: getMessagePreview(message)
    }

    const threadId = await client.createDoc(mail.class.MailThread, core.space.Space, data)
    return await client.findOne(mail.class.MailThread, { _id: threadId as any })
  }

  function getMessagePreview (message: string): string {
    const maxLength = 80
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message
  }

  function getSpace (doc: Doc): Ref<Space> {
    return isSpace(doc) ? doc._id : doc.space
  }
</script>

<FocusHandler {manager} />

<Card
  label={mail.string.CreateMail}
  okAction={createMail}
  canSave={to.trim().length > 0 && isValidEmail(to)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <div class="flex-row-center">
      <div class="flex-grow flex-col">
        <EditBox placeholder={mail.string.From} bind:value={from} />
      </div>
    </div>
  </svelte:fragment>

  <div class="flex-row-center pb-0-5">
    <div class="flex-grow flex-col">
      <EditBox placeholder={mail.string.To} bind:value={to} autoFocus focusIndex={1} />
    </div>
  </div>

  <div class="flex-row-center pb-0-5">
    <div class="flex-grow flex-col">
      <EditBox placeholder={mail.string.Subject} bind:value={subject} focusIndex={2} />
    </div>
  </div>

  <div class="flex-row-center py-2">
    <div class="flex-grow flex-col">
      <EditBox bind:value={message} focusIndex={3} />
    </div>
  </div>
</Card>
