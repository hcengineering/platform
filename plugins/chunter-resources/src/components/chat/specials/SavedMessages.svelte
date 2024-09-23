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
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { Person, PersonAccount, getName as getContactName } from '@hcengineering/contact'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { getDisplayTime, IdMap, Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter, savedMessagesStore } from '@hcengineering/activity-resources'

  import chunter from '../../../plugin'
  import { savedAttachmentsStore } from '../utils'
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

  function getName (
    attach: Attachment,
    personAccountByIdStore: IdMap<PersonAccount>,
    personByIdStore: IdMap<Person>
  ): string | undefined {
    const acc = personAccountByIdStore.get(attach.modifiedBy as Ref<PersonAccount>)
    if (acc !== undefined) {
      const emp = personByIdStore.get(acc?.person)
      if (emp !== undefined) {
        return getContactName(client.getHierarchy(), emp)
      }
    }
  }
  function handleMessageClicked (message?: ActivityMessage): void {
    void openMessageFromSpecial(message)
  }
</script>

<Header icon={chunter.icon.Bookmarks} intlLabel={chunter.string.Saved} titleKind={'breadcrumbs'} />

<Scroller padding={'.75rem .5rem'} bottomPadding={'.75rem'}>
  {#if savedMessages.length > 0 || savedAttachments.length > 0}
    {#each savedMessages as message}
      {#if message.$lookup?.attachedTo}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->

        <ActivityMessagePresenter
          value={message.$lookup?.attachedTo}
          onClick={() => {
            handleMessageClicked(message.$lookup?.attachedTo)
          }}
        />
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
          <AttachmentPreview value={attach.$lookup.attachedTo} isSaved={true} />
          <div class="label">
            <Label
              label={chunter.string.SharedBy}
              params={{
                name: getName(attach.$lookup.attachedTo, $personAccountByIdStore, $personByIdStore),
                time: getDisplayTime(attach.modifiedOn)
              }}
            />
          </div>
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

    &:hover {
      background-color: var(--global-ui-BackgroundColor);
    }

    .label {
      padding-top: 1rem;
    }
  }
</style>
