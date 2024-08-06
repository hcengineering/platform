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
  import { Ref } from '@hcengineering/core'
  import love, { isOffice, Room } from '@hcengineering/love'
  import { Dropdown, Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { rooms } from '../stores'

  export let value: Ref<Room> | undefined
  export let disabled: boolean = false
  export let focusIndex = -1

  const dispatch = createEventDispatcher()

  $: items = $rooms
    .filter((p) => !isOffice(p) && p._id !== love.ids.Reception)
    .map((p) => {
      return {
        _id: p._id,
        label: p.name
      }
    })

  $: selected = value !== undefined ? items.find((p) => p._id === value) : undefined

  function change (id: Ref<Room>) {
    if (value !== id) {
      dispatch('change', id)
      value = id
    }
  }
</script>

{#if items.length > 0}
  <div class="flex-row-center flex-gap-1">
    <Icon icon={love.icon.Mic} size={'small'} />
    <Dropdown
      kind={'ghost'}
      size={'medium'}
      placeholder={love.string.Room}
      {items}
      withSearch={false}
      {selected}
      {disabled}
      {focusIndex}
      on:selected={(e) => {
        change(e.detail._id)
      }}
    />
  </div>
{/if}
