<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import contact, { Employee } from '@anticrm/contact'
  import { Ref, Timestamp } from '@anticrm/core'
  import { Avatar, createQuery } from '@anticrm/presentation'
  import { Label, TimeSince } from '@anticrm/ui'
  import chunter from '../plugin'

  export let replies: Ref<Employee>[] = []
  export let lastReply: Timestamp = new Date().getTime()
  $: employees = new Set(replies)

  const shown: number = 4
  let showReplies: Employee[] = []

  const query = createQuery()

  $: updateQuery(employees)

  function updateQuery (employees: Set<Ref<Employee>>) {
    query.query(
      contact.class.Employee,
      {
        _id: { $in: Array.from(employees) }
      },
      (res) => {
        showReplies = res
      },
      {
        limit: shown
      }
    )
  }
</script>

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
    <Label label={chunter.string.RepliesCount} params={{ replies: replies.length }} />
  </div>
  {#if replies.length > 1}
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
        color: var(--theme-caption-color);
        background-color: var(--theme-bg-selection);
        border-radius: 50%;
      }
    }

    .reply + .reply {
      margin-left: 0.25rem;
    }

    &:hover {
      border: 1px solid var(--theme-button-border-hovered);
      background-color: var(--theme-bg-color);
    }
  }
</style>
