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
  import { Breadcrumb, Header, IconAdd, Loading, ModernButton, Scroller, showPopup } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import MailboxEditorModal from './MailboxEditorModal.svelte'
  import { getAccountClient } from '../utils'
  import { onMount } from 'svelte'
  import { MailboxInfo } from '@hcengineering/account-client'
  import MailboxItem from './MailboxItem.svelte'

  let loading = true
  let mailboxes: MailboxInfo[] = []

  function loadMailboxes (): void {
    getAccountClient().getMailboxes()
      .then((res) => {
        loading = false
        mailboxes = res
        mailboxes.sort((a, b) => a.mailbox.localeCompare(b.mailbox))
      })
      .catch((err) => {
        loading = false
        mailboxes = []
        console.error('Failed to load mailboxes', err)
      })
  }

  function create (): void {
    showPopup(MailboxEditorModal, {}, 'top', (res) => {
      if (res) {
        loadMailboxes()
      }
    })
  }

  onMount(() => {
    loadMailboxes()
  })
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Mailbox} label={setting.string.Mailboxes} size="large" isCurrent />
    <svelte:fragment slot="actions">
      <ModernButton
        kind="primary"
        icon={IconAdd}
        label={setting.string.CreateMailbox}
        size="small"
        on:click={create}
      />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column p-6">
      {#if loading}
        <Loading />
      {:else}
        <Scroller>
          {#each mailboxes as mailbox, i}
            <MailboxItem mailbox={mailbox} mailboxIdx={i} reloadRequested={loadMailboxes} />
          {/each}
        </Scroller>
      {/if}
    </div>
  </div>
</div>
