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
  import { Label, TimeSince } from '@hcengineering/ui'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import notification, {
    ActivityInboxNotification,
    DocNotifyContext,
    InboxNotification,
    InboxNotificationsClient
  } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'

  export let object: ActivityMessage
  export let embedded = false

  const client = getClient()
  const maxDisplayPersons = 5

  $: lastReply = object.lastReply ?? new Date().getTime()
  $: persons = new Set(object.repliedPersons)

  let inboxClient: InboxNotificationsClient | undefined = undefined

  void getResource(notification.function.GetInboxNotificationsClient).then((getClientFn) => {
    inboxClient = getClientFn()
  })

  let displayPersons: Person[] = []

  $: contextByDocStore = inboxClient?.contextByDoc
  $: notificationsByContextStore = inboxClient?.inboxNotificationsByContext

  $: hasNew = hasNewReplies(object, $contextByDocStore, $notificationsByContextStore)
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

  function updateQuery (personIds: Set<Ref<Person>>, personById: IdMap<Person>): void {
    displayPersons = Array.from(personIds)
      .map((id) => personById.get(id))
      .filter((person): person is Person => person !== undefined)
      .slice(0, maxDisplayPersons - 1)
  }

  const replyProvider = client.getModel().findAllSync(activity.class.ReplyProvider, {})[0]

  async function handleReply (e: MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (replyProvider) {
      const fn = await getResource(replyProvider.function)
      fn(object)
    }
  }
</script>

{#if !embedded && object.replies && object.replies > 0}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="flex-row-center container cursor-pointer mt-2" on:click={handleReply}>
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
      <Label label={activity.string.RepliesCount} params={{ replies: object.replies ?? 0 }} />
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
{/if}

<style lang="scss">
  .container {
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    width: fit-content;
    height: 2.125rem;
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
