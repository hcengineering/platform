<!--
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
-->
<script lang="ts">
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'
  import contact, { getName, PersonAccount, Contact, Channel, ChannelProvider } from '@hcengineering/contact'
  import { Account, IdMap } from '@hcengineering/core'

  import Avatar from './Avatar.svelte'
  import { isEmployee, personAccountByIdStore } from '../utils'
  import ChannelsPresenter from './ChannelsPresenter.svelte'

  export let person: Contact
  export let avatarSize: IconSize = 'x-small'
  export let showStatus = true
  export let channelProviders: ChannelProvider[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let channels: Channel[] = []

  $: if (channelProviders.length > 0) {
    query.query(
      contact.class.Channel,
      { attachedTo: person._id, provider: { $in: channelProviders.map((it) => it._id) } },
      (res) => {
        channels = res
      }
    )
  } else {
    channels = []
    query.unsubscribe()
  }

  function getAccount (accountById: IdMap<PersonAccount>, contact: Contact): Account | undefined {
    return Array.from(accountById.values()).find((account) => account.person === contact._id)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="flex-row-center" on:click>
  <Avatar
    {person}
    size={avatarSize}
    name={person.name}
    on:accent-color
    showStatus={showStatus && isEmployee(person)}
    account={getAccount($personAccountByIdStore, person)?._id}
  />
  <div class="flex-col min-w-0 {avatarSize === 'tiny' || avatarSize === 'inline' ? 'ml-1' : 'ml-3'}">
    <div class="label overflow-label text-left">{getName(hierarchy, person)}</div>
  </div>
  {#if channels.length}
    <div class="ml-2">
      <ChannelsPresenter value={channels} editable={false} disabled />
    </div>
  {/if}
</div>

<style lang="scss">
  .label {
    color: var(--global-primary-TextColor);
    font-weight: 500;
  }
</style>
