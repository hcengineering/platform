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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import type { Message } from '@hcengineering/chunter'
  import { getCurrentAccount, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
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
        createdOn: SortingOrder.Descending
      }
    }
  )

  const savedAttachmentsQuery = createQuery()
  let savedAttachmentsIds: Ref<Attachment>[] = []
  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (res) => {
    savedAttachmentsIds = res.map((r) => r.attachedTo)
  })
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.Threads} /></span>
  </div>
</div>
<Scroller>
  {#each threads as thread, i (thread)}
    <Thread _id={thread} {savedAttachmentsIds} />
    {#if i < threads.length - 1}
      <div class="antiDivider" />
    {/if}
  {/each}
</Scroller>
