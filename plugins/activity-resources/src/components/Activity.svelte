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
  import activity from '@hcengineering/activity'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import notification, { DisplayActivityMessage, ActivityMessage } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Component, Grid, Label, Lazy, Spinner } from '@hcengineering/ui'

  import ActivityFilter from './ActivityFilter.svelte'

  export let object: Doc
  export let showCommenInput: boolean = true
  export let transparent: boolean = false
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  const activityMessagesQuery = createQuery()

  let filteredMessages: DisplayActivityMessage[] = []
  let activityMessages: ActivityMessage[] = []
  let isLoading = false

  let isNewestFirst = JSON.parse(localStorage.getItem('activity-newest-first') ?? 'false')

  async function updateActivityMessages (objectId: Ref<Doc>, order: SortingOrder): Promise<void> {
    isLoading = true
    const combineMessagesFn = await getResource(notification.function.CombineActivityMessages)

    const res = activityMessagesQuery.query(
      notification.class.ActivityMessage,
      { attachedTo: objectId },
      (result: ActivityMessage[]) => {
        activityMessages = combineMessagesFn(result, order)
        isLoading = false
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

  $: updateActivityMessages(object._id, isNewestFirst ? SortingOrder.Descending : SortingOrder.Ascending)
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
<div class="p-activity select-text" id={activity.string.Activity}>
  {#if filteredMessages.length}
    <Grid column={1} rowGap={0}>
      {#each filteredMessages as message}
        <Lazy>
          <Component
            is={notification.component.ActivityMessagePresenter}
            props={{
              value: message,
              boundary
            }}
          />
        </Lazy>
      {/each}
    </Grid>
  {/if}
</div>
{#if showCommenInput}
  <div class="ref-input">
    <Component is={notification.component.ChatMessageInput} props={{ object, boundary, focusIndex }} />
  </div>
{/if}

<style lang="scss">
  .ref-input {
    flex-shrink: 0;
    margin-top: 1.75rem;
    padding-bottom: 2.5rem;
  }

  .p-activity {
    margin-top: 1.75rem;
  }

  .invisible {
    display: none;
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  }

  // Remove the line in the last Activity message
</style>
