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
  import { Icon, Label, Scroller } from '@hcengineering/ui'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter, savedMessagesStore } from '@hcengineering/activity-resources'

  import chunter from '../../../plugin'
  import { savedAttachmentsStore } from '../utils'
  import Header from '../../Header.svelte'
  import { openMessageFromSpecial } from '../../../navigation'

  const client = getClient()

  let savedMessages: WithLookup<SavedMessage>[] = []
  let savedAttachments: WithLookup<SavedAttachments>[] = []

  $: savedMessages = $savedMessagesStore
  $: savedAttachments = $savedAttachmentsStore

  async function openAttachment (attach?: Attachment) {
    if (attach === undefined) {
      return
    }
    const messageId: Ref<ActivityMessage> = attach.attachedTo as Ref<ActivityMessage>
    await client.findOne(activity.class.ActivityMessage, { _id: messageId }).then((res) => {
      if (res !== undefined) {
        openMessageFromSpecial(res)
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
  function handleMessageClicked (message?: ActivityMessage) {
    openMessageFromSpecial(message)
  }
</script>

<div class="ac-header full divide caption-height" style="padding: 0.5rem 1rem">
  <Header icon={activity.icon.Bookmark} intlLabel={chunter.string.Saved} titleKind="breadcrumbs" />
</div>

<div class="body h-full w-full">
  <Scroller padding="0.75rem 0.5rem">
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
      <div class="empty">
        <Icon icon={activity.icon.Bookmark} size="large" />
        <div class="an-element__label header">
          <Label label={chunter.string.EmptySavedHeader} />
        </div>
        <span class="an-element__label">
          <Label label={chunter.string.EmptySavedText} />
        </span>
      </div>
    {/if}
  </Scroller>
</div>

<style lang="scss">
  .body {
    background-color: var(--theme-panel-color);
  }
  .empty {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 30rem;
  }

  .header {
    font-weight: 600;
    margin: 1rem;
  }

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
