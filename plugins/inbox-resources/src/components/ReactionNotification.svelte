<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Notification, ReactionNotificationContent, SocialID } from '@hcengineering/communication-types'
  import { MessagePresenter } from '@hcengineering/ui-next'
  import { Card } from '@hcengineering/card'
  import { formatName, getPersonBySocialId, Person } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import { Avatar, personByPersonIdStore, PersonPreviewProvider } from '@hcengineering/contact-resources'

  export let notification: Notification
  export let card: Card

  const client = getClient()
  let content: ReactionNotificationContent = notification.content as ReactionNotificationContent
  $: content = notification.content as ReactionNotificationContent

  let author: Person | undefined
  $: void updateAuthor(content.creator)

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $personByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = await getPersonBySocialId(client, socialId)
    }
  }
</script>

{#if notification.message}
  <div class="notification">
    <div class="header">
      <div class="author">
        <PersonPreviewProvider value={author}>
          <div class="author__avatar">
            <Avatar name={author?.name} person={author} size="tiny" />
          </div>
          <div class="author__name">
            {formatName(author?.name ?? '')}
          </div>
        </PersonPreviewProvider>
      </div>
      reacted
    </div>
    <div class="message">
      <div class="emoji">
        {content.emoji}
      </div>
      <MessagePresenter {card} message={notification.message} editable={false} hideAvatar padding="0.5rem 1rem" />
    </div>
  </div>
{/if}

<style lang="scss">
  .header {
    display: flex;
    gap: 0.25rem;
    color: var(--global-secondary-TextColor);
    margin-left: 1rem;
  }

  .author {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .author__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    margin-right: 1rem;
  }

  .author__name {
    font-weight: 500;
  }

  .message {
    display: flex;
    margin-left: 1rem;
  }

  .emoji {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    width: 2.5rem;
    height: 2.5rem;
    margin-top: 0.75rem;
  }
  .notification {
    position: relative;
    cursor: pointer;
    user-select: none;
  }
</style>
