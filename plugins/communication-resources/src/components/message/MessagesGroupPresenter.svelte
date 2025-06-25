<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getCurrentAccount, Timestamp, isOtherHour } from '@hcengineering/core'
  import { Message } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'

  import DateSeparator from '../DateSeparator.svelte'
  import MessagePresenter from './MessagePresenter.svelte'
  import MessagesSeparator from './MessagesSeparator.svelte'

  export let card: Card
  export let date: Timestamp
  export let messages: Message[]
  export let separatorDate: Date | undefined = undefined
  export let separatorDiv: HTMLDivElement | undefined | null = undefined
  export let readonly = false
  export let customObserver: (node: HTMLDivElement) => { destroy: () => void } = () => {
    return { destroy: () => {} }
  }

  const me = getCurrentAccount()

  $: separatorIndex =
    separatorDate != null
      ? messages.findIndex(
        ({ created, creator }) => separatorDate != null && !me.socialIds.includes(creator) && created >= separatorDate
      )
      : -1
</script>

<div class="messages-group" id={date.toString()} use:customObserver>
  {#if separatorIndex === 0}
    <MessagesSeparator bind:element={separatorDiv} />
  {/if}
  <DateSeparator {date} />
  <div class="messages-group__messages">
    {#each messages as message, index (message.id)}
      {@const previousMessage = messages[index - 1]}
      {@const compact =
        !message.removed &&
        !previousMessage?.removed &&
        previousMessage !== undefined &&
        previousMessage.creator === message.creator &&
        previousMessage.type === message.type &&
        !isOtherHour(previousMessage.created.getTime(), message.created.getTime())}
      {#if separatorIndex !== 0 && index === separatorIndex}
        <MessagesSeparator bind:element={separatorDiv} />
      {/if}
      <MessagePresenter {message} {card} {readonly} {compact} />
    {/each}
  </div>
</div>

<style lang="scss">
  .messages-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
  }

  .messages-group__messages {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1 0 0;
    width: 100%;
  }
</style>
