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
  import type { Message } from '@anticrm/chunter'
  import { ActionIcon } from '@anticrm/ui'
  import Emoji from './icons/Emoji.svelte'
  import Share from './icons/Share.svelte'
  import Bookmark from './icons/Bookmark.svelte'
  import MoreH from './icons/MoreH.svelte'
  import Reactions from './Reactions.svelte'
  import Replies from './Replies.svelte'
  import avatar from '../../img/avatar.png'

  import { MessageViewer } from '@anticrm/presentation'

  export let message: Message

  let name: string
  let time: string
  let reactions: boolean = false
  let replies: boolean = false
  let thread: boolean = false
</script>

<div class="message-container">
  <div class="avatar"><img src={avatar} alt="Avatar"></div>
  <div class="message">
    <div class="header">{name}<span>{time}</span></div>
    <div class="text"><MessageViewer message={message.content}/></div>
    {#if (reactions || replies) && !thread}
      <div class="footer">
        <div>{#if reactions}<Reactions/>{/if}</div>
        <div>{#if replies}<Replies/>{/if}</div>
      </div>
    {/if}
  </div>
  {#if !thread}
    <div class="buttons">
      <div class="tool"><ActionIcon icon={MoreH} size={'medium'} direction={'left'}/></div>
      <div class="tool"><ActionIcon icon={Bookmark} size={'medium'} direction={'left'}/></div>
      <div class="tool"><ActionIcon icon={Share} size={'medium'} direction={'left'}/></div>
      <div class="tool"><ActionIcon icon={Emoji} size={'medium'} direction={'left'}/></div>
    </div>
  {/if}
</div>

<style lang="scss">
  .message-container {
    position: relative;
    display: flex;
    margin-bottom: 32px;
    z-index: 1;

    .avatar {
      min-width: 36px;
      width: 36px;
      height: 36px;
      background-color: var(--theme-bg-accent-color);
      border-radius: 50%;
      user-select: none;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 16px;

      .header {
        font-weight: 500;
        font-size: 16px;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 4px;

        span {
          margin-left: 8px;
          font-weight: 400;
          font-size: 14px;
          line-height: 18px;
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
        height: 32px;
        margin-top: 8px;
        user-select: none;

        div + div {
          margin-left: 16px;
        }
      }
    }

    .buttons {
      position: absolute;
      visibility: hidden;
      top: -8px;
      right: -8px;
      display: flex;
      flex-direction: row-reverse;
      user-select: none;

      .tool {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 20px;
      }

      .tool + .tool {
        margin-right: 8px;
      }
    }

    &:hover > .buttons {
      visibility: visible;
    }
    &:hover::before {
      content: '';
    }

    &::before {
      position: absolute;
      top: -20px;
      left: -20px;
      width: calc(100% + 40px);
      height: calc(100% + 40px);
      background-color: var(--theme-button-bg-enabled);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: 12px;
      z-index: -1;
    }
  }
</style>