<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { TxViewlet } from '@hcengineering/activity'
  import { ActivityKey } from '@hcengineering/activity-resources'
  import { PersonAccount, getName } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import core from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { ActionIcon, Label } from '@hcengineering/ui'

  import ArrowRight from './icons/ArrowRight.svelte'

  export let value: PersonAccount
  export let items: DocUpdates[]
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let selected: boolean

  $: employee = $personByIdStore.get(value.person)

  $: newTxes = items.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew && p.modifiedBy === value._id).length, 0) // items.length
  const dispatch = createEventDispatcher()

  let div: HTMLDivElement

  $: if (selected && div !== undefined) div.focus()
</script>

<div
  class="inbox-activity__container"
  on:keydown
  class:selected
  tabindex="-1"
  bind:this={div}
  on:click={() => dispatch('open', value._id)}
>
  {#if newTxes > 0 && !selected}<div class="notify people" />{/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="inbox-activity__content shrink flex-grow clear-mins read">
    <div class="flex-row-center gap-2">
      <Avatar avatar={employee?.avatar} size="small" />
      {#if employee}
        <span class="font-medium">{getName(employee)}</span>
      {:else}
        <span class="font-medium"><Label label={core.string.System} /></span>
      {/if}
      {#if newTxes > 0}
        <div class="counter people">
          {newTxes}
        </div>
      {/if}
      <div class="arrow">
        <ActionIcon
          icon={ArrowRight}
          size="medium"
          action={() => {
            dispatch('open', value._id)
          }}
        />
      </div>
    </div>
  </div>
</div>
