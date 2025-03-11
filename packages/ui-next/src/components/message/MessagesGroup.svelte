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
  import { Timestamp } from '@hcengineering/core'

  import DateSeparator from '../DateSeparator.svelte'
  import { MessageType } from '../../types'
  import Message from './Message.svelte'

  export let date: Timestamp
  export let messages: MessageType[]
  export let showDates = true
</script>

<div class="messages-group" id={date.toString()}>
  {#if showDates}
    <DateSeparator {date} />
  {/if}
  <div class="messages-group__messages">
    {#each messages as message (message.id)}
      <Message {message} on:reaction on:update on:reply />
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
    padding: 0 2rem;
  }

  .messages-group__messages {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1 0 0;
    width: 100%;
  }
</style>
