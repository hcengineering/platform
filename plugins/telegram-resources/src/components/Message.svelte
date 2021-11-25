<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { TelegramMessage } from '@anticrm/telegram'
  import { MessageViewer } from '@anticrm/presentation'
  import { formatName } from '@anticrm/contact'

  export let message: TelegramMessage
  export let name: string | undefined = undefined

  export let colors: string[] = ['#A5D179', '#77C07B', '#60B96E', '#45AEA3', '#46CBDE', '#47BDF6',
                                 '#5AADF6', '#73A6CD', '#B977CB', '#7C6FCD', '#6F7BC5', '#F28469']

  function getNameColor (name: string): string {
    let hash = 0, i, chr;
    for (i = 0; i < name.length; i++) {
      chr = name.charCodeAt(i)
      hash = ((hash << 5) - hash) + chr
      hash |= 0
    }
    return colors[Math.abs(hash) % colors.length]
  }
</script>

<div class="message" class:incoming={message.incoming}>
  {#if name}
    <div class="name" style="color: {getNameColor(name)}">{formatName(name)}</div>
  {/if}
  <div class="flex">
    <div class="text"><MessageViewer message={message.content}/></div>
    <div class="time">{new Date(message.modifiedOn).toLocaleString('default', { hour: 'numeric', minute: 'numeric'})}</div>
  </div>
</div>

<style lang="scss">
  .message {
    max-width: 66%;
    border-radius: .75rem;
    padding: .75rem;
    width: fit-content;
    justify-self: flex-end;
    background-color: rgba(67, 67, 72, .6);

    &.incoming {
      background-color: rgba(67, 67, 72, .3);
      justify-self: flex-start;
    }

    .text {
      color: var(--theme-caption-color);
      margin-right: 1.25rem;
    }

    .time {
      align-self: flex-end;
      margin-left: auto;
      color: var(--theme-content-trans-color);
      font-size: .75rem;
      font-style: italic;
    }
  }

</style>
