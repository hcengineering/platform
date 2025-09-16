<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->

<script lang="ts">
  import { Notification, ReactionNotificationContent, SocialID } from '@hcengineering/communication-types'
  import { EmojiPresenter } from '@hcengineering/emoji-resources'
  import { Card } from '@hcengineering/card'
  import { Label } from '@hcengineering/ui'
  import { Person } from '@hcengineering/contact'
  import { employeeByPersonIdStore, getPersonByPersonId } from '@hcengineering/contact-resources'

  import NotificationPreview from './preview/NotificationPreview.svelte'
  import PreviewTemplate from './preview/PreviewTemplate.svelte'
  import chat from '../../plugin'

  export let notification: Notification
  export let card: Card

  let content = notification.content as ReactionNotificationContent
  $: content = notification.content as ReactionNotificationContent

  let author: Person | undefined
  $: void updateAuthor(content.creator)

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $employeeByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = (await getPersonByPersonId(socialId)) ?? undefined
    }
  }
</script>

{#if notification.message}
  <div class="reaction-notification">
    <PreviewTemplate socialId={content.creator} date={notification.created} color="secondary" showSeparator={false}>
      <svelte:fragment slot="content">
        <span class="ml-1-5" />
        <Label label={chat.string.ReactedToYourMessage} />
      </svelte:fragment>
    </PreviewTemplate>

    <div class="reaction-notification__body">
      <div class="reaction-notification__emoji">
        <EmojiPresenter emoji={content.emoji} fitSize center />
      </div>
      <NotificationPreview
        {card}
        message={notification.message}
        date={notification.created}
        kind="column"
        padding="0"
      />
    </div>
  </div>
{/if}

<style lang="scss">
  .reaction-notification {
    display: flex;
    flex-direction: column;
    color: var(--global-secondary-TextColor);
    white-space: nowrap;

    &__body {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding-right: var(--spacing-0_75);
      padding-left: var(--spacing-1_25);
    }

    &__emoji {
      display: flex;
      align-items: center;
      font-size: 2rem;
      width: 2.5rem;
      min-width: 2.5rem;
      min-height: 2.5rem;
      height: 2.5rem;
      overflow: hidden;
    }
  }
</style>
