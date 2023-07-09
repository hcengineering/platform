<!--
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
  import { Message } from '@hcengineering/chunter'
  import { Employee } from '@hcengineering/contact'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import { IdMap, Ref } from '@hcengineering/core'
  import { Avatar } from '@hcengineering/contact-resources'
  import { Label, TimeSince } from '@hcengineering/ui'
  import chunter from '../plugin'

  export let message: Message
  $: lastReply = message.lastReply ?? new Date().getTime()
  $: employees = new Set(message.replies)

  const shown: number = 4
  let showReplies: Employee[] = []

  $: updateQuery(employees, $employeeByIdStore)

  function updateQuery (employees: Set<Ref<Employee>>, map: IdMap<Employee>) {
    showReplies = []
    for (const employee of employees) {
      const emp = map.get(employee)
      if (emp !== undefined) {
        showReplies.push(emp)
      }
    }
    showReplies = showReplies
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-row-center container cursor-pointer" on:click>
  <div class="flex-row-center">
    {#each showReplies as reply}
      <div class="reply"><Avatar size={'x-small'} avatar={reply.avatar} /></div>
    {/each}
    {#if employees.size > shown}
      <div class="reply"><span>+{employees.size - shown}</span></div>
    {/if}
  </div>
  <div class="whitespace-nowrap ml-2 mr-2 over-underline">
    <Label label={chunter.string.RepliesCount} params={{ replies: message.replies?.length ?? 0 }} />
  </div>
  {#if (message.replies?.length ?? 0) > 1}
    <div class="mr-1">
      <Label label={chunter.string.LastReply} />
    </div>
  {/if}
  <TimeSince value={lastReply} />
</div>

<style lang="scss">
  .container {
    user-select: none;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.25rem;

    .reply {
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--theme-bg-color);
      border-radius: 50%;

      span {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 1.5rem;
        height: 1.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 0.5;
        color: var(--caption-color);
        background-color: var(--theme-bg-accent-color);
        border-radius: 50%;
      }
    }

    .reply + .reply {
      margin-left: 0.25rem;
    }

    &:hover {
      border: 1px solid var(--button-border-hover);
      background-color: var(--theme-bg-color);
    }
  }
</style>
