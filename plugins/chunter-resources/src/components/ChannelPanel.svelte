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
  import { Class, Ref } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { ChunterSpace } from '@hcengineering/chunter'

  import ChannelPresenter from './ChannelView.svelte'
  import ThreadViewPanel from './threads/ThreadViewPanel.svelte'

  export let _id: Ref<ChunterSpace>
  export let _class: Ref<Class<ChunterSpace>>
  export let context: DocNotifyContext

  const objectQuery = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let object: ChunterSpace | undefined = undefined
  let threadId: Ref<ActivityMessage> | undefined = undefined

  $: threadId = hierarchy.isDerived(context.attachedToClass, activity.class.ActivityMessage)
    ? (context.attachedTo as Ref<ActivityMessage>)
    : undefined

  $: objectQuery.query(_class, { _id }, (res) => {
    object = res[0]
  })
</script>

{#if threadId}
  <ThreadViewPanel _id={threadId} on:close />
{:else if object}
  <div class="antiComponent">
    <ChannelPresenter {object} {context} allowClose on:close />
  </div>
{/if}
