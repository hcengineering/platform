<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { ChunterMessage, ChunterSpace, Message } from '@hcengineering/chunter'
  import { Ref, Space, generateId, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getLocation, navigate } from '@hcengineering/ui'
  import chunter from '../plugin'
  import Channel from './Channel.svelte'
  import PinnedMessages from './PinnedMessages.svelte'

  export let space: Ref<Space>
  let chunterSpace: ChunterSpace
  let isScrollForced = false

  const client = getClient()
  const _class = chunter.class.Message
  let _id = generateId() as Ref<Message>

  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    await client.addCollection(
      _class,
      space,
      space,
      chunterSpace?._class ?? chunter.class.ChunterSpace,
      'messages',
      {
        content: message,
        createBy: me,
        attachments
      },
      _id
    )

    _id = generateId()
    isScrollForced = true
    loading = false
  }

  function openThread (_id: Ref<Message>) {
    const loc = getLocation()
    loc.path[4] = _id
    navigate(loc)
  }

  const pinnedQuery = createQuery()
  let pinnedIds: Ref<ChunterMessage>[] = []
  pinnedQuery.query(
    chunter.class.ChunterSpace,
    { _id: space },
    (res) => {
      pinnedIds = res[0]?.pinned ?? []
      chunterSpace = res[0]
    },
    { limit: 1 }
  )

  const savedMessagesQuery = createQuery()
  let savedMessagesIds: Ref<ChunterMessage>[] = []
  savedMessagesQuery.query(chunter.class.SavedMessages, {}, (res) => {
    savedMessagesIds = res.map((r) => r.attachedTo)
  })

  const savedAttachmentsQuery = createQuery()
  let savedAttachmentsIds: Ref<Attachment>[] = []
  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (res) => {
    savedAttachmentsIds = res.map((r) => r.attachedTo)
  })
  let loading = false
  let content: HTMLElement
</script>

<PinnedMessages {space} {pinnedIds} />
<Channel
  bind:isScrollForced
  bind:content
  {space}
  on:openThread={(e) => {
    openThread(e.detail)
  }}
  {pinnedIds}
  {savedMessagesIds}
  {savedAttachmentsIds}
/>
<div class="reference">
  <AttachmentRefInput bind:loading {space} {_class} objectId={_id} boundary={content} on:message={onMessage} />
</div>

<style lang="scss">
  .reference {
    margin: 1.25rem 2.5rem;
  }
</style>
