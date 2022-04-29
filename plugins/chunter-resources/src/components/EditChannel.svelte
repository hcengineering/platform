<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { ChunterSpace } from '@anticrm/chunter'
  import { EmployeeAccount } from '@anticrm/contact'
  import type { Class, Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery, getClient, Members } from '@anticrm/presentation'
  import { ActionIcon, Icon, IconClose, Label, Scroller, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'
  import AddMembersPopup from './AddMembersPopup.svelte'
  import EditChannelDescriptionTab from './EditChannelDescriptionTab.svelte'
  import EditChannelSettingsTab from './EditChannelSettingsTab.svelte'
  import Lock from './icons/Lock.svelte'

  export let _id: Ref<ChunterSpace>
  export let _class: Ref<Class<ChunterSpace>>

  let channel: ChunterSpace

  const dispatch = createEventDispatcher()

  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()
  $: query.query(chunter.class.ChunterSpace, { _id }, (result) => {
    channel = result[0]
  })

  const tabLabels: IntlString[] = [
    chunter.string.About,
    chunter.string.Members,
    ...(_class === chunter.class.Channel ? [chunter.string.Settings] : [])
  ]
  let selectedTabIndex = 0

  function openAddMembersPopup () {
    showPopup(
      AddMembersPopup,
      { channel },
      undefined,
      () => {},
      async (membersIds: Ref<EmployeeAccount>[]) => {
        if (membersIds) {
          membersIds
            .filter((m: Ref<EmployeeAccount>) => !channel.members.includes(m))
            .forEach(async (m) => {
              await client.update(channel, { $push: { members: m } })
            })
        }
      }
    )
  }
</script>

<div
  on:click={() => {
    dispatch('close')
  }}
/>
<div class="antiDialogs antiComponent">
  <div class="ac-header short mirror divide">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon">
        {#if channel}
          {#if channel.private}
            <Lock size={'medium'} />
          {:else if clazz.icon}<Icon icon={clazz.icon} size={'medium'} />{/if}
        {/if}
      </div>
      <div class="ac-header__title"><Label label={clazz.label} /></div>
    </div>
    <div class="tool">
      <ActionIcon
        icon={IconClose}
        size={'small'}
        action={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <div class="ac-tabs">
    {#each tabLabels as tabLabel, i}
      <div
        class="ac-tabs__tab"
        class:selected={i === selectedTabIndex}
        on:click={() => {
          selectedTabIndex = i
        }}
      >
        <Label label={tabLabel} />
      </div>
    {/each}
    <div class="ac-tabs__empty" />
  </div>
  {#if channel}
    {#if selectedTabIndex === 0}
      <Scroller padding>
        <EditChannelDescriptionTab {channel} on:close />
      </Scroller>
    {:else if selectedTabIndex === 1}
      <Members space={channel} withAddButton={true} on:addMembers={openAddMembersPopup} />
    {:else if selectedTabIndex === 2}
      <EditChannelSettingsTab {channel} on:close />
    {/if}
  {/if}
</div>
