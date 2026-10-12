<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { createEventDispatcher } from 'svelte'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { ChatMessage } from '@hcengineering/chunter'
  import {
    ButtonIcon,
    closeTooltip,
    IconOptionsAsc,
    IconOptionDsc,
    Label,
    Lazy,
    Spinner,
    resizeObserver
  } from '@hcengineering/ui'
  import { ObjectPresenter, DocNavLink } from '@hcengineering/view-resources'
  import { canGroupMessages, getActivityNewestFirst, setActivityNewestFirst } from '@hcengineering/activity-resources'

  import ChatMessageInput from './ChatMessageInput.svelte'
  import ChatMessagePresenter from './ChatMessagePresenter.svelte'
  import { getChannelSpace } from '../../utils'
  import chunter from '../../plugin'

  export let objectId: Ref<Doc>
  export let object: Doc
  export let withInput: boolean = true

  const dispatch = createEventDispatcher()
  const query = createQuery()

  let loading = true
  let messages: ChatMessage[] = []

  let activityOrderNewestFirst = getActivityNewestFirst()
  $: sortLabel = activityOrderNewestFirst ? chunter.string.NewestFirst : chunter.string.OldestFirst
  $: setActivityNewestFirst(activityOrderNewestFirst)
  $: query.query(
    chunter.class.ChatMessage,
    { attachedTo: objectId, space: getChannelSpace(object._class, object._id, object.space) },
    (res) => {
      messages = res.sort((message) => (message?.isPinned ? -1 : 1))
      loading = false
    },
    {
      sort: { createdOn: activityOrderNewestFirst ? SortingOrder.Descending : SortingOrder.Ascending },
      showArchived: true
    }
  )

  let isTextMode = false

  $: if (isTextMode) {
    dispatch('tooltip', { kind: 'popup' })
  }
</script>

<div class="commentPopup-container">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="flex-between flex-gap-2 header"
    use:resizeObserver={() => {
      dispatch('changeContent')
    }}
    on:keydown={(evt) => {
      if (isTextMode) {
        evt.preventDefault()
        evt.stopImmediatePropagation()
        closeTooltip()
      }
    }}
  >
    <div class="fs-title mr-2">
      <Label label={chunter.string.Comments} />
    </div>
    <div class="header-actions flex-row-center flex-gap-2">
      <DocNavLink {object}>
        <ObjectPresenter _class={object._class} objectId={object._id} value={object} />
      </DocNavLink>
      <ButtonIcon
        icon={activityOrderNewestFirst ? IconOptionDsc : IconOptionsAsc}
        kind="tertiary"
        size="small"
        tooltip={{ label: sortLabel, direction: 'bottom' }}
        dataId="chat-message-sort"
        noFocus
        on:click={() => {
          activityOrderNewestFirst = !activityOrderNewestFirst
        }}
      />
    </div>
  </div>
  <div class="messages">
    {#if loading}
      <div class="flex-center">
        <Spinner />
      </div>
    {:else}
      {#each messages as message, index (message._id)}
        {@const canGroup = canGroupMessages(message, messages[index - 1])}
        <div class="item">
          <Lazy>
            <ChatMessagePresenter value={message} hideLink type={canGroup ? 'short' : 'default'} />
          </Lazy>
        </div>
      {/each}
    {/if}
  </div>
  {#if withInput}
    <div class="input">
      <ChatMessageInput
        {object}
        on:focus={() => {
          isTextMode = true
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .commentPopup-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0;
    min-width: 0;
    min-height: 0;
    max-height: 30rem;

    .header {
      flex-shrink: 0;
      margin: 0 0.25rem 0.5rem;
      padding: 0.5rem 0.25rem 1rem 0.25rem;
      border-bottom: 1px solid var(--theme-divider-color);
    }

    .header-actions {
      min-width: 0;
      margin-left: auto;
    }

    .messages {
      overflow: auto;
      flex: 1;
      padding: 0.75rem 0.25rem;
      min-width: 0;
      min-height: 0;

      .item {
        max-width: 30rem;
      }
    }

    .input {
      padding: 0.5rem 0.25rem 0.25rem;
    }
  }
</style>
