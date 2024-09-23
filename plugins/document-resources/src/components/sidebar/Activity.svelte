<!--
//
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
//
-->
<script lang="ts">
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import {
    ActivityFilter,
    ActivityMessagePresenter,
    canGroupMessages,
    combineActivityMessages
  } from '@hcengineering/activity-resources'
  import { SortingOrder } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Lazy, Scroller } from '@hcengineering/ui'

  export let value: Document

  const query = createQuery()

  let messages: ActivityMessage[] = []
  let filteredMessages: ActivityMessage[] = []

  $: query.query(
    activity.class.ActivityMessage,
    { attachedTo: value._id, space: value.space },
    (res) => {
      void combineActivityMessages(res).then((res) => {
        messages = res
      })
    },
    {
      sort: {
        createdOn: SortingOrder.Ascending
      }
    }
  )
</script>

{#key value._id}
  <div class="h-full flex-col clear-mins">
    <div class="header">
      <div class="title"><Label label={activity.string.Activity} /></div>
      <ActivityFilter
        {messages}
        object={value}
        showFilter={false}
        on:update={(e) => {
          filteredMessages = e.detail
        }}
      />
    </div>

    <div class="divider" />

    {#if filteredMessages.length > 0}
      <Scroller padding="0.75rem 0.25rem">
        {#each filteredMessages as message, index}
          {@const canGroup = canGroupMessages(message, filteredMessages[index - 1])}
          <Lazy>
            <ActivityMessagePresenter
              value={message}
              doc={value}
              hideLink={true}
              type={canGroup ? 'short' : 'default'}
            />
          </Lazy>
        {/each}
      </Scroller>
    {/if}
  </div>
{/key}

<style lang="scss">
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.25rem;
    height: 3rem;
    min-height: 3rem;
    border-bottom: 1px solid var(--theme-divider-color);

    .title {
      flex-grow: 1;
      font-weight: 500;
      color: var(--caption-color);
      user-select: none;
    }
  }
</style>
