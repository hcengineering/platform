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
  import {
    Breadcrumb,
    Header,
    IconAdd,
    IconCheck,
    Label,
    Loading,
    ModernButton,
    Scroller,
    showPopup
  } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import MailboxEditorModal from './MailboxEditorModal.svelte'
  import { getAccountClient } from '../utils'
  import { onMount } from 'svelte'
  import { MailboxInfo, MailboxOptions } from '@hcengineering/account-client'
  import MailboxItem from './MailboxItem.svelte'

  let boxesLoading = true
  let optionsLoading = true
  let mailboxes: MailboxInfo[] = []
  let mailboxOptions: MailboxOptions | undefined

  function loadMailboxes (): void {
    getAccountClient()
      .getMailboxes()
      .then((res) => {
        boxesLoading = false
        mailboxes = res
        mailboxes.sort((a, b) => a.mailbox.localeCompare(b.mailbox))
      })
      .catch((err) => {
        boxesLoading = false
        mailboxes = []
        console.error('Failed to load mailboxes', err)
      })
  }

  function loadMailboxOptions (): void {
    getAccountClient()
      .getMailboxOptions()
      .then((res) => {
        optionsLoading = false
        mailboxOptions = res
      })
      .catch((err: any) => {
        optionsLoading = false
        console.error('Failed to load mailbox options', err)
      })
  }

  function create (): void {
    if (mailboxOptions === undefined) {
      console.warn('Mailbox options not loaded yet')
      return
    }
    showPopup(MailboxEditorModal, { mailboxOptions }, 'top', (res) => {
      if (res === true) {
        loadMailboxes()
      }
    })
  }

  onMount(() => {
    loadMailboxes()
    loadMailboxOptions()
  })
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Mailbox} label={setting.string.Mailboxes} size="large" isCurrent />
    <svelte:fragment slot="actions">
      {#if mailboxOptions !== undefined && mailboxOptions.availableDomains.length > 0}
        {#if mailboxes.length >= mailboxOptions.maxMailboxCount}
          <ModernButton
            kind="secondary"
            icon={IconCheck}
            label={setting.string.MailboxLimitReached}
            size="small"
            disabled
          />
        {:else}
          <ModernButton
            kind="primary"
            icon={IconAdd}
            label={setting.string.CreateMailbox}
            disabled={boxesLoading}
            size="small"
            on:click={create}
          />
        {/if}
      {/if}
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column p-6">
      {#if boxesLoading || optionsLoading}
        <Loading />
      {:else if mailboxOptions !== undefined && mailboxOptions.availableDomains.length === 0}
        <div class="hulyComponent-content__empty">
          <Label label={setting.string.MailboxNoDomains} />
        </div>
      {:else}
        <Scroller>
          {#each mailboxes as mailbox, i}
            <MailboxItem
              {mailbox}
              mailboxIdx={i}
              reloadRequested={loadMailboxes}
              loadingRequested={() => {
                boxesLoading = true
              }}
            />
          {/each}
        </Scroller>
      {/if}
    </div>
  </div>
</div>
