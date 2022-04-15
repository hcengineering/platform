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
  import type { Message } from '@anticrm/chunter'
  import { getCurrentAccount, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Label, Scroller } from '@anticrm/ui'
  import chunter from '../plugin'
  import Thread from './Thread.svelte'

  const query = createQuery()
  const me = getCurrentAccount()._id

  let threads: Ref<Message>[] = []

  query.query(
    chunter.class.ThreadMessage,
    {
      createBy: me
    },
    (res) => {
      const ids = new Set(res.map((c) => c.attachedTo))
      threads = Array.from(ids)
    },
    {
      sort: {
        createOn: SortingOrder.Descending
      }
    }
  )
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.Threads} /></span>
  </div>
</div>
<Scroller>
  {#each threads as thread (thread)}
    <div class="item"><Thread _id={thread} /></div>
  {/each}
</Scroller>

<style lang="scss">
  .item + .item {
    margin-top: 3rem;
  }
</style>
