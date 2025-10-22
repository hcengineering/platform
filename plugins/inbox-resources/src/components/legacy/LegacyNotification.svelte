<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import notificationPlugin, {
    ActivityNotificationViewlet,
    CommonInboxNotification,
    DisplayActivityInboxNotification,
    DisplayInboxNotification,
    MentionInboxNotification,
    ReactionInboxNotification
  } from '@hcengineering/notification'
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  import ActivityInboxNotificationPresenter from './ActivityInboxNotificationPresenter.svelte'
  import MentionInboxNotificationPresenter from './MentionInboxNotificationPresenter.svelte'
  import CommonInboxNotificationPresenter from './CommonInboxNotificationPresenter.svelte'
  import ReactionInboxNotificationPresenter from './ReactionInboxNotificationPresenter.svelte'

  export let notification: DisplayInboxNotification
  export let doc: Doc
  export let viewlets: ActivityNotificationViewlet[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function asDisplayActivityNotification (notification: DisplayInboxNotification): DisplayActivityInboxNotification {
    return notification as DisplayActivityInboxNotification
  }

  function asMentionNotification (notification: DisplayInboxNotification): MentionInboxNotification {
    return notification as MentionInboxNotification
  }

  function asReactionNotification (notification: DisplayInboxNotification): ReactionInboxNotification {
    return notification as ReactionInboxNotification
  }

  function asCommonNotification (notification: DisplayInboxNotification): CommonInboxNotification {
    return notification as CommonInboxNotification
  }
</script>

{#if hierarchy.isDerived(notification._class, notificationPlugin.class.ActivityInboxNotification)}
  <ActivityInboxNotificationPresenter value={asDisplayActivityNotification(notification)} object={doc} {viewlets} />
{:else if hierarchy.isDerived(notification._class, notificationPlugin.class.MentionInboxNotification)}
  <MentionInboxNotificationPresenter value={asMentionNotification(notification)} object={doc} />
{:else if hierarchy.isDerived(notification._class, notificationPlugin.class.ReactionInboxNotification)}
  <ReactionInboxNotificationPresenter value={asReactionNotification(notification)} object={doc} />
{:else if hierarchy.isDerived(notification._class, notificationPlugin.class.CommonInboxNotification)}
  <CommonInboxNotificationPresenter value={asCommonNotification(notification)} />
{/if}
