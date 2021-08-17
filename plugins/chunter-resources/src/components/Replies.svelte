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
  import { Avatar } from '@anticrm/presentation'

  export let replies: string[] = ['Chen', 'Elon', 'Tim', 'Elon', 'Tim', 'Chen']

  let shown: number = 4
  let showReplies: Array<string> = []
  for (let i = 0; i < shown; i++) {
    showReplies.push(replies[i])
  }
</script>

<div class="flex-row-center container">
  <div class="counter">{replies.length} Replies</div>
  <div class="flex-row-center">
    {#each showReplies as reply}
      <div class="reply"><Avatar size={28} /></div>
    {/each}
    {#if replies.length > shown}
      <div class="reply"><span>+{replies.length - shown}</span></div>
    {/if}
  </div>
</div>

<style lang="scss">
  .container {
    user-select: none;

    .counter {
      margin-right: .75rem;
      line-height: 150%;
      color: var(--theme-content-color);
      white-space: nowrap;
    }

    .reply {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 1rem;
      height: 1rem;
      background-color: var(--theme-bg-color);
      border-radius: 50%;
      margin-right: -.625rem;

      span {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 1.75rem;
        height: 1.75rem;
        font-size: .75rem;
        font-weight: 500;
        line-height: .5;
        color: var(--theme-caption-color);
        background-color: var(--theme-bg-selection);
        border-radius: 50%;
      }

      &:last-child {
        margin-right: 0;
      }
    }
  }
</style>