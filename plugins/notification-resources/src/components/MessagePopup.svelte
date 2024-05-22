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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Lazy, Spinner } from '@hcengineering/ui'
  import { ActivityMessagePresenter, canGroupMessages } from '@hcengineering/activity-resources'
  import { ActivityInboxNotification, InboxNotification } from '@hcengineering/notification'

  import { isActivityNotification, isMentionNotification } from '../utils'

  export let notifications: InboxNotification[]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let loading = true
  let messages: ActivityMessage[] = []

  $: void updateMessages(notifications)

  async function updateMessages (notifications: InboxNotification[]): Promise<void> {
    const result: ActivityMessage[] = []

    for (const notification of notifications) {
      if (isActivityNotification(notification)) {
        const it = notification as WithLookup<ActivityInboxNotification>
        if (it.$lookup?.attachedTo) {
          result.push(it.$lookup?.attachedTo)
        }
      }

      if (isMentionNotification(notification)) {
        const it = notification
        if (hierarchy.isDerived(it.mentionedInClass, activity.class.ActivityMessage)) {
          const message = await client.findOne<ActivityMessage>(it.mentionedInClass, {
            _id: it.mentionedIn as Ref<ActivityMessage>
          })
          if (message !== undefined) {
            result.push(message)
          }
        }
      }
    }

    messages = result.reverse()
    loading = false
  }
</script>

<div class="commentPopup-container">
  <div class="messages">
    {#if loading}
      <div class="flex-center">
        <Spinner />
      </div>
    {:else}
      {#each messages as message, index}
        {@const canGroup = canGroupMessages(message, messages[index - 1])}
        <div class="item">
          <Lazy>
            <ActivityMessagePresenter
              value={message}
              hideLink
              skipLabel
              type={canGroup ? 'short' : 'default'}
              hoverStyles="filledHover"
            />
          </Lazy>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style lang="scss">
  .commentPopup-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0;
    min-width: 20rem;
    min-height: 0;
    max-height: 20rem;

    .messages {
      overflow: auto;
      flex: 1;
      min-width: 0;
      min-height: 0;

      .item {
        max-width: 30rem;
      }
    }
  }
</style>
