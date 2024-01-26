<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { IconClose, Label, location as locationStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { ActivityScrolledView } from '@hcengineering/activity-resources'

  import chunter from '../../plugin'
  import ThreadParentMessage from './ThreadParentPresenter.svelte'

  export let _id: Ref<ActivityMessage>
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let showHeader: boolean = true

  const messageQuery = createQuery()
  const dispatch = createEventDispatcher()

  let message: DisplayActivityMessage | undefined = undefined

  locationStore.subscribe((newLocation) => {
    selectedMessageId = newLocation.query?.message as Ref<ActivityMessage> | undefined
  })

  $: messageQuery.query(activity.class.ActivityMessage, { _id }, (result: ActivityMessage[]) => {
    message = result[0] as DisplayActivityMessage
  })

  let isLoading = false
  let content: HTMLDivElement | undefined = undefined
</script>

{#if showHeader}
  <div class="header">
    <div class="title"><Label label={chunter.string.Thread} /></div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="tool"
      on:click={() => {
        dispatch('close')
      }}
    >
      <IconClose size="medium" />
    </div>
  </div>
{/if}
{#if message}
  <ThreadParentMessage {message} />

  <div class="separator">
    {#if message.replies && message.replies > 0}
      <div class="label lower">
        <Label label={activity.string.RepliesCount} params={{ replies: message.replies }} />
      </div>
    {/if}
    <div class="line" />
  </div>

  <ActivityScrolledView
    bind:isLoading
    bind:scrollElement={content}
    {selectedMessageId}
    _class={chunter.class.ThreadMessage}
    withDates={false}
    skipLabels
    object={message}
  />
{/if}

<style lang="scss">
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.75rem 0 1rem;
    height: 4rem;
    min-height: 4rem;

    .title {
      flex-grow: 1;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--caption-color);
      user-select: none;
    }

    .tool {
      margin-left: 0.75rem;
      opacity: 0.4;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }
  }

  .separator {
    display: flex;
    align-items: center;

    .label {
      white-space: nowrap;
      margin: 0.5rem;
      color: var(--theme-halfcontent-color);
    }

    .line {
      background: var(--theme-refinput-border);
      height: 1px;
      width: 100%;
    }
  }
</style>
