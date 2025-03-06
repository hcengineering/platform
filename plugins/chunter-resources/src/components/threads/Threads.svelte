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
  import { getCurrentAccount, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Scroller, Loading, Lazy } from '@hcengineering/ui'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'
  import notification from '@hcengineering/notification'
  import attachment from '@hcengineering/attachment'

  import chunter from '../../plugin'
  import Header from '../Header.svelte'
  import { openMessageFromSpecial } from '../../navigation'
  import BlankView from '../BlankView.svelte'
  import LoadingHistory from '../LoadingHistory.svelte'

  const threadsQuery = createQuery()

  let threads: ActivityMessage[] = []
  let isLoading = true

  let divScroll: HTMLElement | undefined | null = undefined

  let limit = 100
  let hasNextPage = true

  $: threadsQuery.query(
    activity.class.ActivityMessage,
    {
      replies: { $gte: 1 },
      [`${notification.mixin.Collaborators}.collaborators`]: getCurrentAccount().uuid
    },
    (res) => {
      if (res.length <= limit) {
        hasNextPage = false
      } else {
        res.pop()
      }
      threads = res
      isLoading = false
    },
    {
      sort: { modifiedOn: SortingOrder.Descending },
      lookup: {
        _id: {
          attachments: attachment.class.Attachment,
          reactions: activity.class.Reaction
        }
      },
      limit: limit + 1
    }
  )

  function handleScroll (): void {
    if (divScroll != null && hasNextPage && threads.length === limit) {
      const isAtBottom = divScroll.scrollTop + divScroll.clientHeight >= divScroll.scrollHeight - 400
      if (isAtBottom) {
        limit += 100
      }
    }
  }
</script>

<Header icon={chunter.icon.Thread} intlLabel={chunter.string.Threads} titleKind={'breadcrumbs'} />

<Scroller bind:divScroll padding="0.75rem 0.5rem" noStretch={threads.length > 0} onScroll={handleScroll}>
  {#if isLoading}
    <Loading />
  {:else if threads.length === 0}
    <BlankView icon={chunter.icon.Thread} header={chunter.string.NoThreadsYet} />
  {:else}
    {#each threads as thread}
      <div class="container">
        <Lazy>
          <ActivityMessagePresenter
            value={thread}
            onClick={() => openMessageFromSpecial(thread)}
            withShowMore={false}
          />
        </Lazy>
      </div>
    {/each}
    {#if hasNextPage}
      <LoadingHistory isLoading={threads.length < limit} />
    {/if}
  {/if}
</Scroller>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    min-height: 3.75rem;
  }
</style>
