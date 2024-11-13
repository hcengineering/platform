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
  import { AccountRole, Ref, getCurrentAccount, hasAccountRole, WithLookup } from '@hcengineering/core'
  import { Breadcrumb, Header, IconEdit, ModernButton, Component } from '@hcengineering/ui'
  import { Floor, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import { ViewletSelector } from '@hcengineering/view-resources'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'

  import lovePlg from '../plugin'
  import { currentRoom, floors } from '../stores'
  import ControlBar from './ControlBar.svelte'

  export let rooms: Room[] = []
  export let floor: Ref<Floor>

  const dispatch = createEventDispatcher()

  let viewlet: WithLookup<Viewlet> | undefined
  let preference: ViewletPreference | undefined
  let loading = false

  $: selectedFloor = $floors.filter((fl) => fl._id === floor)[0]

  const me = getCurrentAccount()

  let editable: boolean = false
  $: editable = hasAccountRole(me, AccountRole.Maintainer)
</script>

<div class="hulyComponent">
  <Header allowFullsize adaptive={'disabled'}>
    <Breadcrumb title={selectedFloor?.name ?? ''} size={'large'} isCurrent />
    <svelte:fragment slot="beforeTitle">
      <ViewletSelector bind:viewlet bind:preference bind:loading viewletQuery={{ attachTo: lovePlg.class.Floor }} />
    </svelte:fragment>
    <svelte:fragment slot="actions">
      {#if editable}
        <ModernButton
          icon={IconEdit}
          label={lovePlg.string.EditOffice}
          size={'small'}
          on:click={() => dispatch('configure')}
        />
      {/if}
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    {#if viewlet?.$lookup?.descriptor?.component}
      <Component is={viewlet.$lookup.descriptor.component} props={{ floor, rooms }} on:open />
    {/if}
  </div>
  {#if $currentRoom}
    <ControlBar room={$currentRoom} />
  {/if}
</div>
