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
  import { AttachmentRefInput } from '@anticrm/attachment-resources'
  import { ChunterMessage, Message } from '@anticrm/chunter'
  import { generateId, getCurrentAccount, Ref, Space, TxFactory } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { getCurrentLocation, navigate } from '@anticrm/ui'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'
  import Channel from './Channel.svelte'
  import PinnedMessages from './PinnedMessages.svelte'

  export let space: Ref<Space>

  const client = getClient()
  const _class = chunter.class.Message
  let _id = generateId() as Ref<Message>
  const notificationClient = NotificationClientImpl.getClient()

  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    const txFactory = new TxFactory(me)
    const tx = txFactory.createTxCreateDoc<Message>(
      _class,
      space,
      {
        attachedTo: space,
        attachedToClass: chunter.class.Channel,
        collection: 'messages',
        content: message,
        createOn: 0,
        createBy: me,
        attachments
      },
      _id
    )
    tx.attributes.createOn = tx.modifiedOn
    await notificationClient.updateLastView(space, chunter.class.Channel, tx.modifiedOn, true)
    await client.tx(tx)

    // Create an backlink to document
    await createBacklinks(client, space, chunter.class.Channel, _id, message)

    _id = generateId()
  }

  function openThread (_id: Ref<Message>) {
    const loc = getCurrentLocation()
    loc.path[3] = _id
    navigate(loc)
  }

  const pinnedQuery = createQuery()
  let pinnedIds: Ref<ChunterMessage>[] = []
  pinnedQuery.query(
    chunter.class.Channel,
    { _id: space },
    (res) => {
      pinnedIds = res[0]?.pinned ?? []
    },
    { limit: 1 }
  )
</script>

<PinnedMessages {pinnedIds} />
<Channel {space} on:openThread={(e) => {openThread(e.detail)}} {pinnedIds} />
<div class="reference">
  <AttachmentRefInput {space} {_class} objectId={_id} on:message={onMessage} />
</div>

<style lang="scss">
  .reference {
    margin: 1.25rem 2.5rem;
  }
</style>
