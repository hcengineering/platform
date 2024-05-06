<!--
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
-->
<script lang="ts">
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ActivityMessage } from '@hcengineering/activity'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { DocNotifyContext } from '@hcengineering/notification'

  import { ThreadView } from '../../index'
  import ChannelView from '../ChannelView.svelte'

  export let _id: Ref<Doc>

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const contextByIdStore = notificationsClient.contextById
  const objectQuery = createQuery()

  let threadId: Ref<ActivityMessage> | undefined = undefined
  let context: DocNotifyContext | undefined = undefined
  let object: Doc | undefined = undefined

  $: context = $contextByIdStore.get(_id as Ref<DocNotifyContext>)
  $: threadId = context ? undefined : (_id as Ref<ActivityMessage>)

  $: context &&
    objectQuery.query(context.attachedToClass, { _id: context.attachedTo }, (res) => {
      ;[object] = res
    })
</script>

{#if threadId}
  <ThreadView _id={threadId} on:close />
{:else if object}
  <ChannelView {object} {context} allowClose embedded on:close />
{/if}
