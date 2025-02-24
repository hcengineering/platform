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
  import chunter, { ChatMessage } from '@hcengineering/chunter'
  import { DocumentQuery, SortingOrder } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller, SearchEdit } from '@hcengineering/ui'
  import { FilterBar } from '@hcengineering/view-resources'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  import plugin from '../../../plugin'
  import { openMessageFromSpecial } from '../../../navigation'

  export let withHeader: boolean = true
  export let search: string = ''

  let searchQuery: DocumentQuery<ChatMessage> = { $search: search }

  function updateSearchQuery (search: string): void {
    searchQuery = { $search: search }
  }

  $: updateSearchQuery(search)

  const client = getClient()
  let messages: ChatMessage[] = []

  let resultQuery: DocumentQuery<ChatMessage> = { ...searchQuery }

  async function updateMessages (resultQuery: DocumentQuery<ChatMessage>) {
    messages = await client.findAll(
      chunter.class.ChatMessage,
      {
        ...resultQuery
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 100
      }
    )
  }

  $: updateMessages(resultQuery)
</script>

{#if withHeader}
  <div class="ac-header full divide">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title"><Label label={plugin.string.MessagesBrowser} /></span>
    </div>
    <SearchEdit
      value={search}
      on:change={() => {
        updateSearchQuery(search)
        updateMessages(resultQuery)
      }}
    />
  </div>
{/if}
<FilterBar
  _class={chunter.class.ChatMessage}
  space={undefined}
  query={searchQuery}
  on:change={(e) => (resultQuery = e.detail)}
/>
{#if messages.length > 0}
  <Scroller padding={'1rem 0'} bottomPadding={'1rem'}>
    {#each messages as message}
      <ActivityMessagePresenter
        value={message}
        onClick={() => {
          openMessageFromSpecial(message)
        }}
      />
    {/each}
  </Scroller>
{:else}
  <div class="flex-center h-full text-lg">
    <Label label={plugin.string.NoResults} />
  </div>
{/if}
