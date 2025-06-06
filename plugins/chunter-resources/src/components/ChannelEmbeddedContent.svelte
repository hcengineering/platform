<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Doc, Ref } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { ActivityMessage } from '@hcengineering/activity'

  import Channel from './Channel.svelte'
  import { ThreadView } from '../index'

  export let height: string
  export let width: string
  export let object: Doc
  export let threadId: Ref<ActivityMessage> | undefined
  export let collection: string | undefined = undefined
  export let withInput: boolean = true
  export let readonly: boolean = false
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = notificationsClient.contextByDoc

  let context: DocNotifyContext | undefined = undefined

  $: context = object ? $contextByDocStore.get(object._id) : undefined

  $: renderChannel = threadId === undefined
  $: visible = height !== '0px' && width !== '0px'
</script>

{#if renderChannel && visible}
  <div class="channel" class:invisible={threadId !== undefined} style:height style:width>
    {#key object._id}
      <slot name="header" />
      <Channel
        {object}
        {context}
        syncLocation={false}
        freeze={threadId !== undefined}
        {collection}
        {withInput}
        {onReply}
        {readonly}
      />
    {/key}
  </div>
{/if}
{#if threadId && visible}
  <div class="thread" style:height style:width>
    <ThreadView _id={threadId} syncLocation={false} {onReply} {readonly} on:channel on:close />
  </div>
{/if}

<style lang="scss">
  .channel {
    display: inline-flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    position: absolute;
    top: 0;
    left: 0;

    &.invisible {
      visibility: hidden;
    }
  }

  .thread {
    position: absolute;
    display: inline-flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    top: 0;
    left: 0;
    background-color: var(--theme-panel-color);
  }
</style>
