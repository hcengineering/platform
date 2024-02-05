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
  import { ActivityMessage, ActivityMessagesFilter, DisplayActivityMessage } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { getMessageFromLoc } from '@hcengineering/activity-resources'

  import chunter from '../plugin'
  import ChannelScrollView from './ChannelScrollView.svelte'

  export let context: DocNotifyContext
  export let object: Doc | undefined
  export let filters: Ref<ActivityMessagesFilter>[] = []
  export let messages: DisplayActivityMessage[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined

  const unsubscribe = locationStore.subscribe((newLocation) => {
    selectedMessageId = getMessageFromLoc(newLocation)
  })

  onDestroy(unsubscribe)

  $: isDocChannel = !hierarchy.isDerived(context.attachedToClass, chunter.class.ChunterSpace)
  $: collection = isDocChannel ? 'comments' : 'messages'
</script>

<ChannelScrollView
  {messages}
  objectId={context.attachedTo}
  objectClass={context.attachedToClass}
  {object}
  skipLabels={!isDocChannel}
  selectedFilters={filters}
  startFromBottom
  {selectedMessageId}
  {collection}
  lastViewedTimestamp={context.lastViewedTimestamp}
/>
