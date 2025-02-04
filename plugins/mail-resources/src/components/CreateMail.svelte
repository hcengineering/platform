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
  import core, { Data, generateId, getCurrentAccount } from '@hcengineering/core'
  import { PersonAccount } from '@hcengineering/contact'
  import { Card, getClient } from '@hcengineering/presentation'
  import { MailThread } from '@hcengineering/mail'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import mail from '../plugin'

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const client = getClient()
  const account = getCurrentAccount() as PersonAccount

  let to = ''
  let from = getEmail()
  let subject = ''
  let message = ''

  const id = generateId()

  export function canClose (): boolean {
    return to === '' && from === '' && subject === ''
  }

  export function getEmail (): string {
    const mail = account.email
    if (mail.includes('@')) {
      return mail
    }
    return `${mail}@huly.me`
  }

  async function createMail (): Promise<void> {
    const account = getCurrentAccount() as PersonAccount
    const data: Data<MailThread> = {
      mailThreadId: generateId(),
      from,
      to,
      subject,
      name: subject,
      description: '',
      private: true,
      members: [account._id],
      archived: false
    }

    const mailThreadId = await client.createDoc(mail.class.MailThread, core.space.Space, data, id)

    dispatch('close', mailThreadId)
  }
</script>

<FocusHandler {manager} />

<Card
  label={mail.string.CreateMail}
  okAction={createMail}
  canSave={to.trim().length > 0}
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
      <EditBox placeholder={mail.string.To} bind:value={to} autoFocus focusIndex={1}/>
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
