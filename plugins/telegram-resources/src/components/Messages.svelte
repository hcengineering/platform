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
  import type { SharedTelegramMessage } from '@hcengineering/telegram'
  import Message from './Message.svelte'
  import { Ref } from '@hcengineering/core'
  import DateView from './Date.svelte'

  export let messages: SharedTelegramMessage[] = []
  export let selectable: boolean = false
  export let selected: Set<Ref<SharedTelegramMessage>> = new Set<Ref<SharedTelegramMessage>>()

  function isNewDate (messages: SharedTelegramMessage[], i: number): boolean {
    if (i === 0) return true
    const current = new Date(messages[i].sendOn).toLocaleDateString()
    const prev = new Date(messages[i - 1].sendOn).toLocaleDateString()
    return current !== prev
  }

  function needName (messages: SharedTelegramMessage[], i: number): boolean {
    if (i === 0) return true
    const current = messages[i]
    const prev = messages[i - 1]
    return current.incoming !== prev.incoming || current.modifiedBy !== prev.modifiedBy
  }

  function select (id: Ref<SharedTelegramMessage>): void {
    if (!selectable) return
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.add(id)
    }
    selected = selected
  }
</script>

{#if messages}
  {#each messages as message, i (message._id)}
    {#if isNewDate(messages, i)}
      <DateView {message} />
    {/if}
    <Message
      {message}
      {selectable}
      selected={selected.has(message._id)}
      showName={needName(messages, i)}
      on:select={() => {
        select(message._id)
      }}
    />
  {/each}
{/if}
