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
  import { Avatar, getClient } from '@anticrm/presentation'
  import type { Message } from '@anticrm/chunter'
  // import { ActionIcon, IconMoreH } from '@anticrm/ui'
  // import Emoji from './icons/Emoji.svelte'
  // import Share from './icons/Share.svelte'
  // import Bookmark from './icons/Bookmark.svelte'
  import Reactions from './Reactions.svelte'
  import Replies from './Replies.svelte'

  import { MessageViewer } from '@anticrm/presentation'
  import { getTime, getUser } from '../utils'
  import { formatName } from '@anticrm/contact'

  export let message: Message

  let reactions: boolean = false
  let replies: boolean = false
  let thread: boolean = false

  const client = getClient()
</script>

<div class="container">
  <div class="avatar"><Avatar size={'medium'} /></div>
  <div class="message">
    <div class="header">
      {#await getUser(client, message.modifiedBy) then user}
        {#if user}{formatName(user.name)}{/if}
      {/await}
    <span>{getTime(message.modifiedOn)}</span>
    </div>
    <div class="text"><MessageViewer message={message.content}/></div>
    {#if (reactions || replies) && !thread}
      <div class="footer">
        <div>{#if reactions}<Reactions/>{/if}</div>
        <div>{#if replies}<Replies/>{/if}</div>
      </div>
    {/if}
  </div>
  <!-- {#if !thread}
    <div class="buttons">
      <div class="tool"><ActionIcon icon={IconMoreH} size={'medium'}/></div>
      <div class="tool"><ActionIcon icon={Bookmark} size={'medium'}/></div>
      <div class="tool"><ActionIcon icon={Share} size={'medium'}/></div>
      <div class="tool"><ActionIcon icon={Emoji} size={'medium'}/></div>
    </div>
  {/if} -->
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    margin-bottom: 2rem;
    z-index: 1;

    .avatar { min-width: 2.25rem; }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        font-weight: 500;
        font-size: 1rem;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: .25rem;

        span {
          margin-left: .5rem;
          font-weight: 400;
          font-size: .875rem;
          line-height: 1.125rem;
          opacity: .4;
        }
      }
      .text {
        line-height: 150%;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 2rem;
        margin-top: .5rem;
        user-select: none;

        div + div {
          margin-left: 1rem;
        }
      }
    }

    // .buttons {
    //   position: absolute;
    //   visibility: hidden;
    //   top: -.5rem;
    //   right: -.5rem;
    //   display: flex;
    //   flex-direction: row-reverse;
    //   user-select: none;

    //   .tool + .tool {
    //     margin-right: .5rem;
    //   }
    // }

    // &:hover > .buttons {
    //   visibility: visible;
    // }
    &:hover::before {
      content: '';
    }

    &::before {
      position: absolute;
      top: -1.25rem;
      left: -1.25rem;
      width: calc(100% + 2.5rem);
      height: calc(100% + 2.5rem);
      background-color: var(--theme-button-bg-enabled);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: .75rem;
      z-index: -1;
    }
  }
</style>