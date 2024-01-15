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
  import attachment, { Attachment, SavedAttachments } from '@hcengineering/attachment'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { Person, PersonAccount, getName as getContactName } from '@hcengineering/contact'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { getDisplayTime, IdMap, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Icon, Label, Scroller } from '@hcengineering/ui'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  import chunter from '../../../plugin'
  import { openMessageFromSpecial } from '../../../utils'

  const client = getClient()

  let savedMessages: WithLookup<SavedMessage>[] = []
  let savedAttachments: WithLookup<SavedAttachments>[] = []

  const savedMessagesQuery = createQuery()
  const savedAttachmentsQuery = createQuery()

  savedMessagesQuery.query(
    activity.class.SavedMessage,
    {},
    (res) => {
      savedMessages = res
    },
    { lookup: { attachedTo: activity.class.ActivityMessage } }
  )

  savedAttachmentsQuery.query(
    attachment.class.SavedAttachments,
    {},
    (res) => {
      savedAttachments = res
    },
    { lookup: { attachedTo: attachment.class.Attachment } }
  )

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
    a: Attachment,
    personAccountByIdStore: IdMap<PersonAccount>,
    personByIdStore: IdMap<Person>
  ): string | undefined {
    const acc = personAccountByIdStore.get(a.modifiedBy as Ref<PersonAccount>)
    if (acc !== undefined) {
      const emp = personByIdStore.get(acc?.person)
      if (emp !== undefined) {
        return getContactName(client.getHierarchy(), emp)
      }
    }
  }
</script>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.SavedItems} /></span>
  </div>
</div>
<Scroller>
  {#if savedMessages.length > 0 || savedAttachments.length > 0}
    {#each savedMessages as message}
      {#if message.$lookup?.attachedTo}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->

        <ActivityMessagePresenter
          value={message.$lookup?.attachedTo}
          onClick={() => {
            openMessageFromSpecial(message.$lookup?.attachedTo)
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

<style lang="scss">
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
    padding: 2rem;

    &:hover {
      background-color: var(--highlight-hover);
    }

    .label {
      padding-top: 1rem;
    }
  }
</style>
