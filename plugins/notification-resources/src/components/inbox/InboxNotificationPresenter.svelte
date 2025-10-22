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
  import { Doc, type Ref, type Space } from '@hcengineering/core'
  import notification, {
    ActivityNotificationViewlet,
    CommonInboxNotification,
    DisplayActivityInboxNotification,
    DisplayInboxNotification,
    MentionInboxNotification,
    ReactionInboxNotification
  } from '@hcengineering/notification'
  import ActivityInboxNotificationPresenter from './ActivityInboxNotificationPresenter.svelte'
  import MentionInboxNotificationPresenter from './MentionInboxNotificationPresenter.svelte'
  import ReactionInboxNotificationPresenter from './ReactionInboxNotificationPresenter.svelte'
  import CommonInboxNotificationPresenter from './CommonInboxNotificationPresenter.svelte'

  export let value: DisplayInboxNotification
  export let object: Doc | undefined
  export let viewlets: ActivityNotificationViewlet[] = []
  export let space: Ref<Space> | undefined = undefined

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

{#if hierarchy.isDerived(value._class, notification.class.ActivityInboxNotification)}
  <ActivityInboxNotificationPresenter value={asDisplayActivityNotification(value)} {object} {viewlets} {space} />
{:else if hierarchy.isDerived(value._class, notification.class.MentionInboxNotification)}
  <MentionInboxNotificationPresenter value={asMentionNotification(value)} {object} {space} />
{:else if hierarchy.isDerived(value._class, notification.class.ReactionInboxNotification)}
  <ReactionInboxNotificationPresenter value={asReactionNotification(value)} {object} />
{:else if hierarchy.isDerived(value._class, notification.class.CommonInboxNotification)}
  <CommonInboxNotificationPresenter value={asCommonNotification(value)} />
{/if}
