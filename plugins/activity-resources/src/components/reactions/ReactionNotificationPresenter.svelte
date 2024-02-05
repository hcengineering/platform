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
  import { ActivityInboxNotification } from '@hcengineering/notification'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { createQuery } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { Action, getLocation, navigate } from '@hcengineering/ui'

  import ActivityMessagePresenter from '../activity-message/ActivityMessagePresenter.svelte'

  export let message: DisplayActivityMessage
  export let notification: ActivityInboxNotification
  export let embedded = false
  export let showNotify = true
  export let withActions = true
  export let actions: Action[] = []
  export let excludedActions: string[] = []
  export let onClick: (() => void) | undefined = undefined

  const parentQuery = createQuery()

  let parentMessage: ActivityMessage | undefined = undefined

  $: embedded &&
    parentQuery.query(activity.class.ActivityMessage, { _id: message.attachedTo as Ref<ActivityMessage> }, (res) => {
      parentMessage = res[0]
    })

  function handleReply (): void {
    const loc = getLocation()
    loc.path[3] = notification.docNotifyContext
    loc.path[4] = parentMessage?._id ?? message._id
    loc.query = { message: parentMessage?._id ?? message._id }
    navigate(loc)
  }
</script>

{#if embedded && parentMessage}
  <ActivityMessagePresenter
    value={parentMessage}
    skipLabel
    embedded
    {withActions}
    {actions}
    {excludedActions}
    hoverable={false}
    onReply={handleReply}
    {onClick}
  />
{:else if !embedded && message}
  <ActivityMessagePresenter
    value={message}
    skipLabel
    showEmbedded
    showNotify={showNotify && !notification.isViewed}
    {withActions}
    {actions}
    {excludedActions}
    hoverable={false}
    onReply={handleReply}
    {onClick}
  />
{/if}
