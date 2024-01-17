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
  import { ActivityInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'
  import activity, { ActivityMessage, DisplayActivityMessage, DocUpdateMessage } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { getLocation, navigate } from '@hcengineering/ui'

  export let context: DocNotifyContext
  export let notification: ActivityInboxNotification

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()
  const messageQuery = createQuery()

  let parentMessage: ActivityMessage | undefined = undefined
  let message: ActivityMessage | undefined = undefined

  $: messageQuery.query(notification.attachedToClass, { _id: notification.attachedTo }, (res) => {
    message = res[0]
  })

  $: isReaction &&
    parentQuery.query(activity.class.ActivityMessage, { _id: context.attachedTo as Ref<ActivityMessage> }, (res) => {
      parentMessage = res[0]
    })

  $: isReaction =
    message &&
    hierarchy.isDerived(message._class, activity.class.DocUpdateMessage) &&
    (message as DocUpdateMessage).objectClass === activity.class.Reaction

  function handleReply (): void {
    const loc = getLocation()
    loc.fragment = context._id
    loc.query = { message: notification.attachedTo }
    navigate(loc)
  }
</script>

{#if message}
  <ActivityMessagePresenter value={parentMessage ?? message} embedded skipLabel={isReaction} onReply={handleReply} />
{/if}
