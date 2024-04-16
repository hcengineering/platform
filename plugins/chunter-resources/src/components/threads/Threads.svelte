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
  import { Scroller } from '@hcengineering/ui'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { PersonAccount } from '@hcengineering/contact'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  import chunter from '../../plugin'
  import Header from '../Header.svelte'
  import { openMessageFromSpecial } from '../../navigation'

  const threadsQuery = createQuery()
  const me = getCurrentAccount() as PersonAccount

  let threads: ActivityMessage[] = []

  $: threadsQuery.query(
    activity.class.ActivityMessage,
    {
      replies: { $exists: true }
    },
    (res) => {
      threads = res.filter(
        ({ createdBy, repliedPersons, replies }) =>
          (replies !== undefined && replies > 0 && createdBy === me._id) || repliedPersons?.includes(me.person)
      )
    },
    { sort: { modifiedOn: SortingOrder.Descending } }
  )
</script>

<div class="ac-header full divide caption-height" style="padding: 0.5rem 1rem">
  <Header icon={chunter.icon.Thread} intlLabel={chunter.string.Threads} titleKind="breadcrumbs" />
</div>

<div class="body h-full w-full">
  <Scroller padding="0.75rem 0.5rem">
    {#each threads as thread}
      <ActivityMessagePresenter value={thread} onClick={() => openMessageFromSpecial(thread)} withShowMore={false} />
    {/each}
  </Scroller>
</div>

<style lang="scss">
  .body {
    background-color: var(--theme-panel-color);
  }
</style>
