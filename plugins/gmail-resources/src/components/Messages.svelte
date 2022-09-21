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
  import type { SharedMessage } from '@hcengineering/gmail'
  import MessageView from './Message.svelte'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'

  export let messages: SharedMessage[] = []
  export let selectable: boolean = false
  export let selected: Set<Ref<SharedMessage>> = new Set<Ref<SharedMessage>>()
  const dispatch = createEventDispatcher()

  function select (id: Ref<SharedMessage>): void {
    if (!selectable) {
      const currentMessage = messages.find((m) => m._id === id)
      dispatch('select', currentMessage)
    } else {
      if (selected.has(id)) {
        selected.delete(id)
      } else {
        selected.add(id)
      }
      selected = selected
    }
  }
</script>

{#if messages}
  {#each messages as message (message._id)}
    <MessageView
      {message}
      {selectable}
      selected={selected.has(message._id)}
      on:select={() => {
        select(message._id)
      }}
    />
  {/each}
{/if}
