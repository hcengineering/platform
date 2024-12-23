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
  import { getClient } from '@hcengineering/presentation'
  import { Ref, Space, matchQuery, Doc } from '@hcengineering/core'
  import notification, {
    ActivityInboxNotification,
    ActivityNotificationViewlet,
    DisplayActivityInboxNotification
  } from '@hcengineering/notification'
  import {
    ActivityMessagePreview,
    combineActivityMessages,
    sortActivityMessages
  } from '@hcengineering/activity-resources'
  import { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { Action, Component } from '@hcengineering/ui'
  import { getActions } from '@hcengineering/view-resources'
  import { getResource } from '@hcengineering/platform'

  export let object: Doc | undefined
  export let value: DisplayActivityInboxNotification
  export let viewlets: ActivityNotificationViewlet[] = []
  export let space: Ref<Space> | undefined = undefined

  let viewlet: ActivityNotificationViewlet | undefined = undefined
  let displayMessage: DisplayActivityMessage | undefined = undefined
  let actions: Action[] = []

  $: void updateDisplayMessage(value.combinedMessages)

  async function updateDisplayMessage (messages: ActivityMessage[]): Promise<void> {
    const combinedMessages = await combineActivityMessages(sortActivityMessages(messages))

    displayMessage = combinedMessages[0]
  }

  $: void getAllActions(value).then((res) => {
    actions = res
  })

  $: updateViewlet(viewlets, displayMessage)

  function updateViewlet (viewlets: ActivityNotificationViewlet[], message?: DisplayActivityMessage): void {
    if (viewlets.length === 0 || message === undefined) {
      viewlet = undefined
      return
    }

    for (const v of viewlets) {
      const matched = matchQuery([message], v.messageMatch, message._class, getClient().getHierarchy(), true)
      if (matched.length > 0) {
        viewlet = v
        return
      }
    }

    viewlet = undefined
  }

  async function getAllActions (value: ActivityInboxNotification): Promise<Action[]> {
    const notificationActions = await getActions(getClient(), value, notification.class.InboxNotification)

    const result: Action[] = []

    for (const action of notificationActions) {
      const actionImpl = await getResource(action.action)
      result.push({
        ...action,
        action: (event?: any) => actionImpl(value, event, action.actionProps)
      })
    }

    return result
  }
</script>

{#if displayMessage !== undefined}
  {#if viewlet}
    <Component
      is={viewlet.presenter}
      props={{
        message: displayMessage,
        notification: value,
        actions
      }}
      on:click
    />
  {:else}
    <ActivityMessagePreview value={displayMessage} {actions} {space} doc={object} on:click />
  {/if}
{/if}
