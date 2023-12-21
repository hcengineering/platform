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
  import { createEventDispatcher } from 'svelte'
  import { Class, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, IconClose, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import {
    ActivityExtension,
    ActivityMessagePresenter,
    combineActivityMessages
  } from '@hcengineering/activity-resources'
  import { buildRemovedDoc, checkIsObjectRemoved } from '@hcengineering/view-resources'

  export let _id: Ref<ActivityMessage>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const selectedMessageQuery = createQuery()
  const messagesQuery = createQuery()
  const objectQuery = createQuery()

  let messages: DisplayActivityMessage[] = []
  let selectedMessage: ActivityMessage | undefined = undefined
  let object: Doc | undefined = undefined
  let isLoading: boolean = true

  let scrollElement: HTMLDivElement | undefined

  $: selectedMessageQuery.query(
    activity.class.ActivityMessage,
    { _id },
    (result: ActivityMessage[]) => {
      selectedMessage = result[0]
    },
    {
      limit: 1
    }
  )

  async function loadObject (_id: Ref<Doc>, _class: Ref<Class<Doc>>) {
    const isRemoved = await checkIsObjectRemoved(client, _id, _class)

    if (isRemoved) {
      object = await buildRemovedDoc(client, _id, _class)
    } else {
      objectQuery.query(_class, { _id }, (res) => {
        object = res[0]
      })
    }
  }

  $: selectedMessage && loadObject(selectedMessage.attachedTo, selectedMessage.attachedToClass)
  $: objectPresenter =
    selectedMessage && hierarchy.classHierarchyMixin(selectedMessage.attachedToClass, view.mixin.ObjectPresenter)

  $: selectedMessage &&
    messagesQuery.query(
      activity.class.ActivityMessage,
      { attachedTo: selectedMessage.attachedTo },
      (result: ActivityMessage[]) => {
        messages = combineActivityMessages(result)
        isLoading = false
      },
      {
        sort: {
          modifiedOn: SortingOrder.Ascending
        }
      }
    )

  function scrollToBottom () {
    setTimeout(() => {
      if (scrollElement !== undefined) {
        scrollElement.scrollTo(0, scrollElement.scrollHeight)
      }
    }, 100)
  }
</script>

<div class="ac-header full divide caption-height withoutBackground">
  <div class="ac-header__wrap-title mr-3">
    {#if objectPresenter && object}
      <Component is={objectPresenter.presenter} props={{ value: object }} />
    {/if}
  </div>

  {messages.length}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="tool" on:click={() => dispatch('close')}>
    <IconClose size="medium" />
  </div>
</div>

{#if isLoading}
  <div class="spinner">
    <Spinner size="small" />
  </div>
{/if}

{#if !isLoading}
  <div class="flex-col vScroll content" bind:this={scrollElement}>
    {#each messages as message}
      <ActivityMessagePresenter
        value={message}
        isHighlighted={message._id === _id}
        shouldScroll={_id === message._id}
      />
    {/each}
  </div>
{/if}
{#if object}
  <div class="ref-input">
    <ActivityExtension kind="input" props={{ object }} on:submit={scrollToBottom} />
  </div>
{/if}

<style lang="scss">
  .content {
    padding: 0 24px;
  }

  .spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .tool {
    margin-left: 0.75rem;
    opacity: 0.4;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }

  .ref-input {
    margin: 1.25rem 1rem;
  }
</style>
