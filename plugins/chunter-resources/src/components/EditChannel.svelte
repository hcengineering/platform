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
  import { ChunterSpace } from '@hcengineering/chunter'
  import type { Class, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { SpaceMembers } from '@hcengineering/contact-resources'
  import { Label, Panel, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'
  import EditChannelDescriptionTab from './EditChannelDescriptionTab.svelte'
  import EditChannelSettingsTab from './EditChannelSettingsTab.svelte'

  export let _id: Ref<ChunterSpace>
  export let _class: Ref<Class<ChunterSpace>>

  let channel: ChunterSpace

  const dispatch = createEventDispatcher()

  const client = getClient()
  $: clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()
  $: query.query(chunter.class.ChunterSpace, { _id }, (result) => {
    channel = result[0]
  })
</script>

<Panel
  isHeader={false}
  isAside={_class === chunter.class.Channel}
  on:open
  on:update
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    {#if clazz && channel}
      {#if _class === chunter.class.DirectMessage}
        <span class="title"><Label label={clazz.label} /></span>
      {:else}
        <span class="title">
          <span class="trans-title content-color"><Label label={clazz.label} />›</span>
          {channel.name}
        </span>
      {/if}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="aside">
    {#if _class === chunter.class.Channel}
      <div class="flex-col-center">
        <span class="fs-title text-xl overflow-label mt-4 mb-2"><Label label={chunter.string.Settings} /></span>
        <EditChannelSettingsTab {channel} on:close />
      </div>
    {/if}
  </svelte:fragment>

  <Scroller>
    <div class="popupPanel-body__main-content py-10 h-full clear-mins">
      {#if channel}
        <div class="flex-col flex-no-shrink">
          <span class="fs-title text-xl overflow-label mb-2 flex-no-shrink">
            <Label label={chunter.string.About} />
          </span>
          <EditChannelDescriptionTab {channel} on:close />
        </div>
        <div class="flex-col mt-10 flex-no-shrink">
          <span class="fs-title text-xl overflow-label mb-2 flex-no-shrink">
            <Label label={chunter.string.Members} />
          </span>
          <SpaceMembers space={channel} withAddButton={true} />
        </div>
      {/if}
    </div>
  </Scroller>
</Panel>
