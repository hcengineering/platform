<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Channel } from '@anticrm/chunter'
  import { Ref, Space } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { closePopup, getCurrentLocation, Icon, navigate } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import chunter from '../plugin'

  export let value: Channel
  const client = getClient()
  const dispatch = createEventDispatcher()

  $: icon = client.getHierarchy().getClass(value._class).icon

  function selectSpace (id: Ref<Space>) {
    closePopup()
    const loc = getCurrentLocation()
    loc.path[1] = chunter.app.Chunter
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }
</script>

<div
  class="flex-row-center hover-trans"
  on:click={() => {
    dispatch('click')
    selectSpace(value._id)
  }}
>
  {#if icon}
    <Icon {icon} size={'small'} />
  {/if}
  {value.name}
</div>
