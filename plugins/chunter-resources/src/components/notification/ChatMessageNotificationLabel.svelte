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
  import { Label } from '@hcengineering/ui'
  import { ActivityInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { ActivityDocLink, ActivityMessageNotificationLabel } from '@hcengineering/activity-resources'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Doc, Ref } from '@hcengineering/core'
  import { getDocLinkTitle } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'

  import chunter from '../../plugin'

  export let context: DocNotifyContext
  export let notification: ActivityInboxNotification

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()

  let parentMessage: ActivityMessage | undefined = undefined
  let title: string | undefined = undefined
  let object: Doc | undefined = undefined

  $: isThread = hierarchy.isDerived(notification.attachedToClass, chunter.class.ThreadMessage)
  $: isThread &&
    parentQuery.query(activity.class.ActivityMessage, { _id: context.attachedTo as Ref<ActivityMessage> }, (res) => {
      parentMessage = res[0]
    })

  $: parentMessage &&
    getDocLinkTitle(client, parentMessage.attachedTo, parentMessage.attachedToClass).then((res) => {
      title = res
    })

  $: parentMessage &&
    client.findOne(parentMessage.attachedToClass, { _id: parentMessage.attachedTo }).then((res) => {
      object = res
    })

  $: panelMixin = parentMessage
    ? hierarchy.classHierarchyMixin(parentMessage.attachedToClass, view.mixin.ObjectPanel)
    : undefined
  $: panelComponent = panelMixin?.component ?? view.component.EditDoc
</script>

{#if isThread && object}
  <div class="label overflow-label">
    <Label label={chunter.string.Thread} />
    <ActivityDocLink {title} preposition={activity.string.In} {object} {panelComponent} />
  </div>
{:else if !isThread}
  <ActivityMessageNotificationLabel {context} {notification} />
{/if}

<style lang="scss">
  .label {
    width: 20rem;
    max-width: 20rem;
  }
</style>
