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
  import { Attachment, SavedAttachments } from '@hcengineering/attachment'
  import { AttachmentPreview, savedAttachmentsStore } from '@hcengineering/attachment-resources'
  import { getName as getContactName } from '@hcengineering/contact'
  import { getPersonByPersonId } from '@hcengineering/contact-resources'
  import { getDisplayTime, Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller, Lazy } from '@hcengineering/ui'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter, savedMessagesStore } from '@hcengineering/activity-resources'

  import chunter from '../../../plugin'
  import Header from '../../Header.svelte'
  import { openMessageFromSpecial } from '../../../navigation'
  import BlankView from '../../BlankView.svelte'

  const client = getClient()

  let savedMessages: WithLookup<SavedMessage>[] = []
  let savedAttachments: WithLookup<SavedAttachments>[] = []

  $: savedMessages = $savedMessagesStore
  $: savedAttachments = $savedAttachmentsStore

  async function openAttachment (attach?: Attachment): Promise<void> {
    if (attach === undefined) {
      return
    }
    const messageId: Ref<ActivityMessage> = attach.attachedTo as Ref<ActivityMessage>
    await client.findOne(activity.class.ActivityMessage, { _id: messageId }).then((res) => {
      if (res !== undefined) {
        void openMessageFromSpecial(res)
      }
    })
  }

  async function getName (attach: Attachment): Promise<string | undefined> {
    const person = await getPersonByPersonId(attach.modifiedBy)

    if (person != null) {
      return getContactName(client.getHierarchy(), person)
    }
  }

  function handleMessageClicked (message?: ActivityMessage): void {
    void openMessageFromSpecial(message)
  }

  $: isEmpty = savedMessages.length === 0 && savedAttachments.length === 0
</script>

<Header icon={chunter.icon.Bookmarks} intlLabel={chunter.string.Saved} titleKind={'breadcrumbs'} />

<Scroller padding={'.75rem .5rem'} bottomPadding={'.75rem'} noStretch={!isEmpty}>
  {#if !isEmpty}
    {#each savedMessages as message}
      {#if message.$lookup?.attachedTo}
        <div class="message-container">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <Lazy>
            <ActivityMessagePresenter
              value={message.$lookup?.attachedTo}
              onClick={() => {
                handleMessageClicked(message.$lookup?.attachedTo)
              }}
            />
          </Lazy>
        </div>
      {/if}
    {/each}
    {#each savedAttachments as attach}
      {#if attach.$lookup?.attachedTo}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="attachmentContainer flex-no-shrink clear-mins"
          on:click={() => openAttachment(attach.$lookup?.attachedTo)}
        >
          <Lazy>
            <AttachmentPreview value={attach.$lookup.attachedTo} isSaved={true} />
            <div class="label">
              {#await getName(attach.$lookup.attachedTo) then name}
                <Label
                  label={chunter.string.SharedBy}
                  params={{
                    name,
                    time: getDisplayTime(attach.modifiedOn)
                  }}
                />
              {/await}
            </div>
          </Lazy>
        </div>
      {/if}
    {/each}
  {:else}
    <BlankView
      icon={activity.icon.Bookmark}
      header={chunter.string.EmptySavedHeader}
      label={chunter.string.EmptySavedText}
    />
  {/if}
</Scroller>

<style lang="scss">
  .attachmentContainer {
    cursor: pointer;
    padding: 2rem;
    border-radius: 0.25rem;
    min-height: 3.75rem;

    &:hover {
      background-color: var(--global-ui-BackgroundColor);
    }

    .label {
      padding-top: 1rem;
    }
  }

  .message-container {
    display: flex;
    flex-direction: column;
    min-height: 3.75rem;
  }
</style>
