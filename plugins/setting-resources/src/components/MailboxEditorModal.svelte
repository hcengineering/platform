<!--
// Copyright © 2025 Anticrm Platform Contributors.
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
-->
<script lang="ts">
  import { MailboxOptions } from '@hcengineering/account-client'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Dropdown, ListItem, Modal, ModernEditbox, Spinner, themeStore } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import { createEventDispatcher } from 'svelte'
  import { getAccountClient } from '../utils'
  import { IntlString, translateCB } from '@hcengineering/platform'
  import contact, { getCurrentEmployee, SocialIdentityRef } from '@hcengineering/contact'
  import { buildSocialIdString, SocialIdType } from '@hcengineering/core'

  export let mailboxOptions: MailboxOptions

  let name = ''
  let loading = false
  let error: string | undefined
  let domains: ListItem[] = []
  let domain: ListItem | undefined

  const dispatch = createEventDispatcher()

  $: canSave = !loading && validateName(name)
  $: domains = mailboxOptions.availableDomains.map((d) => ({ _id: d, label: '@' + d }))

  function validateName (name: string): boolean {
    const n = name.trim()
    return n.length >= mailboxOptions.minNameLength && n.length <= mailboxOptions.maxNameLength && !name.includes('+')
  }

  async function createMailbox (): Promise<void> {
    const { mailbox, socialId } = await getAccountClient().createMailbox(name, (domain ?? domains[0])._id)
    console.log('Mailbox created', mailbox, socialId)
    const currentUser = getCurrentEmployee()
    const client = getClient()
    await client.addCollection(
      contact.class.SocialIdentity,
      contact.space.Contacts,
      currentUser,
      contact.class.Person,
      'socialIds',
      {
        key: buildSocialIdString({ type: SocialIdType.EMAIL, value: mailbox }),
        type: SocialIdType.EMAIL,
        value: mailbox,
        verifiedOn: Date.now()
      },
      socialId as SocialIdentityRef
    )
    await client.addCollection(
      contact.class.Channel,
      contact.space.Contacts,
      currentUser,
      contact.class.Person,
      'channels',
      {
        provider: contact.channelProvider.Email,
        value: mailbox
      }
    )
  }

  async function save (): Promise<void> {
    loading = true
    try {
      await createMailbox()
      loading = false
      dispatch('close', true)
    } catch (err: any) {
      loading = false
      formatError(err)
      console.error('Failed to create mailbox', err)
    }
  }

  function formatError (err: any): void {
    error = `${err}`
    let errMsg: IntlString | undefined
    const errParams: Record<string, any> = {}
    if (error.includes('MailboxError')) {
      if (error.includes('invalid-name')) {
        errMsg = setting.string.MailboxErrorInvalidName
      } else if (error.includes('domain-not-found')) {
        errMsg = setting.string.MailboxErrorDomainNotFound
      } else if (error.includes('name-rules-violated')) {
        errMsg = setting.string.MailboxErrorNameRulesViolated
        errParams.minLen = mailboxOptions.minNameLength
        errParams.maxLen = mailboxOptions.maxNameLength
      } else if (error.includes('mailbox-exists')) {
        errMsg = setting.string.MailboxErrorMailboxExists
      } else if (error.includes('mailbox-count-limit')) {
        errMsg = setting.string.MailboxErrorMailboxCountLimit
      }
    }
    if (errMsg === undefined) {
      loading = false
      return
    }
    translateCB(errMsg, errParams, $themeStore.language, (r) => {
      loading = false
      error = r
    })
  }
</script>

<Modal
  label={setting.string.CreateMailbox}
  type="type-popup"
  width="small"
  okLabel={presentation.string.Create}
  okAction={save}
  {canSave}
  showCancelButton={false}
  onCancel={() => {
    dispatch('close')
  }}
>
  <div class="flex-col-stretch flex-gap-4">
    <div class="flex-row-center flex-gap-2">
      <ModernEditbox
        bind:value={name}
        label={setting.string.CreateMailboxPlaceholder}
        size="medium"
        style="flex: 1"
        autoFocus
        focusIndex={100500}
      />
      <Dropdown
        size="large"
        placeholder={setting.string.CreateMailbox}
        items={domains}
        selected={domain ?? domains[0]}
        withSearch={false}
      />
    </div>
    {#if error}
      <div style="color: var(--theme-error-color)">{error}</div>
    {/if}
  </div>
  <svelte:fragment slot="buttons">
    {#if loading}
      <Spinner size="medium" />
    {/if}
  </svelte:fragment>
</Modal>
