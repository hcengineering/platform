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
  import { Person } from '@hcengineering/contact'
  import { personByIdStore, Avatar } from '@hcengineering/contact-resources'
  import { Doc, IdMap, Ref, WithLookup } from '@hcengineering/core'
  import { getLocation, Label, navigate, TimeSince } from '@hcengineering/ui'
  import { ActivityMessage } from '@hcengineering/activity'
  import notification, {
    ActivityInboxNotification,
    DocNotifyContext,
    InboxNotification,
    InboxNotificationsClient
  } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'

  import activity from '../plugin'

  export let message: ActivityMessage
  export let onReply: (() => void) | undefined = undefined

  const maxDisplayPersons = 5

  $: lastReply = message.lastReply ?? new Date().getTime()
  $: persons = new Set(message.repliedPersons)

  let inboxClient: InboxNotificationsClient | undefined = undefined

  getResource(notification.function.GetInboxNotificationsClient).then((getClientFn) => {
    inboxClient = getClientFn()
  })

  let displayPersons: Person[] = []

  $: docNotifyContextByDocStore = inboxClient?.docNotifyContextByDoc
  $: notificationsByContextStore = inboxClient?.inboxNotificationsByContext

  $: hasNew = hasNewReplies(message, $docNotifyContextByDocStore, $notificationsByContextStore)
  $: updateQuery(persons, $personByIdStore)

  function hasNewReplies (
    message: ActivityMessage,
    notifyContexts?: Map<Ref<Doc>, DocNotifyContext>,
    inboxNotificationsByContext?: Map<Ref<DocNotifyContext>, WithLookup<InboxNotification>[]>
  ): boolean {
    const context: DocNotifyContext | undefined = notifyContexts?.get(message._id)

    if (context === undefined) {
      return false
    }

    return (inboxNotificationsByContext?.get(context._id) ?? [])
      .filter((notification) => {
        const activityNotifications = notification as ActivityInboxNotification
        return activityNotifications.attachedToClass !== activity.class.DocUpdateMessage
      })
      .some(({ isViewed }) => !isViewed)
  }

  function updateQuery (personIds: Set<Ref<Person>>, personById: IdMap<Person>) {
    displayPersons = Array.from(personIds)
      .map((id) => personById.get(id))
      .filter((person): person is Person => person !== undefined)
      .slice(0, maxDisplayPersons - 1)
  }

  function handleReply (e: any) {
    e.stopPropagation()
    e.preventDefault()

    if (onReply) {
      onReply()
      return
    }
    const loc = getLocation()
    loc.path[4] = message._id
    navigate(loc)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="flex-row-center container cursor-pointer" on:click={handleReply}>
  <div class="flex-row-center">
    <div class="avatars">
      {#each displayPersons as person}
        <Avatar size="x-small" avatar={person.avatar} name={person.name} />
      {/each}
    </div>

    {#if persons.size > maxDisplayPersons}
      <div class="plus">
        +{persons.size - maxDisplayPersons}
      </div>
    {/if}
  </div>
  <div class="whitespace-nowrap ml-2 mr-2 over-underline repliesCount">
    <Label label={activity.string.RepliesCount} params={{ replies: message.replies ?? 0 }} />
  </div>
  {#if hasNew}
    <div class="notifyMarker" />
  {/if}
  <div class="lastReply">
    <Label label={activity.string.LastReply} />
  </div>
  <div class="time">
    <TimeSince value={lastReply} />
  </div>
</div>

<style lang="scss">
  .container {
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    width: fit-content;
    margin-left: -0.5rem;

    .plus {
      margin-left: 0.25rem;
    }

    .repliesCount {
      color: var(--theme-link-color);
      font-weight: 500;
    }

    .time {
      font-size: 0.75rem;
    }

    .lastReply {
      font-size: 0.75rem;
      margin-right: 0.25rem;
    }

    .notifyMarker {
      margin-right: 0.25rem;
      width: 0.425rem;
      height: 0.425rem;
      border-radius: 50%;
      background-color: var(--highlight-red);
    }

    &:hover {
      border: 1px solid var(--button-border-hover);
      background-color: var(--theme-bg-color);
    }
  }

  .avatars {
    display: flex;
    gap: 0.25rem;
  }
</style>
