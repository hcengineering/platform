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
  import { getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { PersonAccount } from '@hcengineering/contact'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  import chunter from '../../../plugin'

  const threadsQuery = createQuery()
  const me = getCurrentAccount() as PersonAccount

  let threads: ActivityMessage[] = []

  $: threadsQuery.query(
    activity.class.ActivityMessage,
    {
      replies: { $gte: 1 }
    },
    (res) => {
      threads = res.filter(
        ({ createdBy, repliedPersons }) => createdBy === me._id || repliedPersons?.includes(me.person)
      )
    }
  )
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.Threads} /></span>
  </div>
</div>

<Scroller>
  {#each threads as thread}
    <div class="ml-4 mr-4">
      <ActivityMessagePresenter value={thread} />
    </div>
  {/each}
</Scroller>
