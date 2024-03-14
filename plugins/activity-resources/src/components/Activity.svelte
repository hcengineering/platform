<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import activity, { ActivityExtension, ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Grid, Label, Lazy, Spinner } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import ActivityExtensionComponent from './ActivityExtension.svelte'
  import ActivityFilter from './ActivityFilter.svelte'
  import { combineActivityMessages } from '../activityMessagesUtils'

  export let object: Doc
  export let showCommenInput: boolean = true
  export let transparent: boolean = false
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  const client = getClient()
  const activityMessagesQuery = createQuery()

  let extensions: ActivityExtension[] = []

  let filteredMessages: DisplayActivityMessage[] = []
  let activityMessages: ActivityMessage[] = []
  let isLoading = false

  let isNewestFirst = JSON.parse(localStorage.getItem('activity-newest-first') ?? 'false')

  $: void client.findAll(activity.class.ActivityExtension, { ofClass: object._class }).then((res) => {
    extensions = res
  })

  async function updateActivityMessages (objectId: Ref<Doc>, order: SortingOrder): Promise<void> {
    isLoading = true

    const res = activityMessagesQuery.query(
      activity.class.ActivityMessage,
      { attachedTo: objectId, hidden: { $ne: true } },
      (result: ActivityMessage[]) => {
        void combineActivityMessages(result, order).then((messages) => {
          activityMessages = messages
          isLoading = false
        })
      },
      {
        sort: {
          createdOn: SortingOrder.Ascending
        }
      }
    )
    if (!res) {
      isLoading = false
    }
  }

  $: void updateActivityMessages(object._id, isNewestFirst ? SortingOrder.Descending : SortingOrder.Ascending)
</script>

<div class="antiSection-header high mt-9" class:invisible={transparent}>
  <span class="antiSection-header__title flex-row-center">
    <Label label={activity.string.Activity} />
    {#if isLoading}
      <div class="ml-1">
        <Spinner size="small" />
      </div>
    {/if}
  </span>
  <ActivityFilter
    messages={activityMessages}
    {object}
    on:update={(e) => {
      filteredMessages = e.detail
    }}
    bind:isNewestFirst
  />
</div>
{#if isNewestFirst && showCommenInput}
  <div class="ref-input newest-first">
    <ActivityExtensionComponent kind="input" {extensions} props={{ object, boundary, focusIndex }} />
  </div>
{/if}
<div class="p-activity select-text" id={activity.string.Activity} class:newest-first={isNewestFirst}>
  {#if filteredMessages.length}
    <Grid column={1} rowGap={0}>
      {#each filteredMessages as message}
        <Lazy>
          <Component
            is={activity.component.ActivityMessagePresenter}
            props={{
              value: message,
              hideLink: true,
              boundary
            }}
          />
        </Lazy>
      {/each}
    </Grid>
  {/if}
</div>
{#if showCommenInput && !isNewestFirst}
  <div class="ref-input oldest-first">
    <ActivityExtensionComponent kind="input" {extensions} props={{ object, boundary, focusIndex }} />
  </div>
{/if}

<style lang="scss">
  .ref-input {
    flex-shrink: 0;
    &.newest-first {
      margin-bottom: 1rem;
      padding-top: 1rem;
    }
    &.oldest-first {
      padding-bottom: 2.5rem;
    }
  }

  .p-activity {
    &.newest-first {
      padding-bottom: 1.75rem;
    }
    &:not(.newest-first) {
      margin: 1.75rem 0;
    }
  }

  .invisible {
    display: none;
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  }

  // Remove the line in the last Activity message
</style>
