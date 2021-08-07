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
  import avatar from '../../img/avatar.png'

  export let replies: string[] = ['Chen', 'Elon', 'Tim', 'Elon', 'Tim', 'Chen']

  let shown: number = 4
  let showReplies: Array<string> = []
  for (let i = 0; i < shown; i++) {
    showReplies.push(replies[i])
  }
</script>

<div class="replies-container">
  <div class="counter">{replies.length} Replies</div>
  <div class="replies">
    {#each showReplies as reply}
      <div class="reply"><img class="circle" src={avatar} alt={reply}></div>
    {/each}
    {#if replies.length > shown}
      <div class="reply"><span>+{replies.length - shown}</span></div>
    {/if}
  </div>
</div>

<style lang="scss">
  .replies-container {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    user-select: none;

    .counter {
      margin-right: 12px;
      line-height: 150%;
      color: var(--theme-content-color);
      white-space: nowrap;
    }

    .replies {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;

      .reply {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 32px;
        height: 32px;
        background-color: var(--theme-bg-color);
        border-radius: 50%;
        margin-right: -10px;

        .circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }

        span {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 28px;
          height: 28px;
          font-size: 12px;
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
  }
</style>