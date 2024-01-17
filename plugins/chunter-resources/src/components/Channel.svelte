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
  import { Doc, Ref } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { location as locationStore } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import activity, { ActivityMessage, ActivityMessagesFilter } from '@hcengineering/activity'
  import { ActivityScrolledView } from '@hcengineering/activity-resources'
  import { getClient } from '@hcengineering/presentation'

  import chunter from '../plugin'

  export let context: DocNotifyContext
  export let object: Doc
  export let filterId: Ref<ActivityMessagesFilter> = activity.ids.AllFilter

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined

  const unsubscribe = locationStore.subscribe((newLocation) => {
    selectedMessageId = newLocation.query?.message as Ref<ActivityMessage> | undefined
  })

  onDestroy(unsubscribe)

  $: isDocChannel = !hierarchy.isDerived(context.attachedToClass, chunter.class.ChunterSpace)
  $: messagesClass = isDocChannel ? activity.class.ActivityMessage : chunter.class.ChatMessage
  $: collection = isDocChannel ? 'comments' : 'messages'
</script>

<ActivityScrolledView
  _class={messagesClass}
  {object}
  skipLabels={!isDocChannel}
  filter={filterId}
  startFromBottom
  {selectedMessageId}
  {collection}
  lastViewedTimestamp={context.lastViewedTimestamp}
/>
