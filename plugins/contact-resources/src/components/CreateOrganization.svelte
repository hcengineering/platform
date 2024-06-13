<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter, AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { Channel, findContacts, Organization } from '@hcengineering/contact'
  import core, {
    AttachedData,
    fillDefaults,
    generateId,
    makeCollaborativeDoc,
    Ref,
    TxOperations,
    WithLookup
  } from '@hcengineering/core'
  import { Card, getClient, InlineAttributeBar } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text-editor'
  import { Button, createFocusManager, EditBox, FocusHandler, IconAttachment, IconInfo, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import contact from '../plugin'
  import ChannelsDropdown from './ChannelsDropdown.svelte'
  import Company from './icons/Company.svelte'
  import OrganizationPresenter from './OrganizationPresenter.svelte'

  export let onCreate: ((orgId: Ref<Organization>, client: TxOperations) => Promise<void>) | undefined = undefined

  export function canClose (): boolean {
    return object.name === ''
  }

  const id: Ref<Organization> = generateId()

  const object: Organization = {
    name: '',
    description: makeCollaborativeDoc(id, 'description'),
    attachments: 0
  } as unknown as Organization

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let description = EmptyMarkup

  fillDefaults(hierarchy, object, contact.class.Organization)

  async function createOrganization (): Promise<void> {
    await client.createDoc(
      contact.class.Organization,
      contact.space.Contacts,
      {
        ...object,
        $markup: {
          description
        }
      },
      id
    )
    await descriptionBox.createAttachments(id)

    for (const channel of channels) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        id,
        contact.class.Organization,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }
    if (onCreate !== undefined) {
      await onCreate?.(id, client)
    }

    dispatch('close', id)
  }

  let channels: AttachedData<Channel>[] = []

  const manager = createFocusManager()

  let matches: WithLookup<Organization>[] = []
  let matchedChannels: AttachedData<Channel>[] = []

  $: void findContacts(client, contact.class.Organization, object.name, channels).then((p) => {
    matches = p.contacts as Organization[]
    matchedChannels = p.channels
  })

  let descriptionBox: AttachmentStyledBox
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
</script>

<FocusHandler {manager} />

<Card
  label={contact.string.CreateOrganization}
  okAction={createOrganization}
  hideAttachments={attachments.size === 0}
  canSave={object.name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins mb-3">
    <div class="mr-3">
      <Button icon={Company} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox
      placeholder={contact.string.OrganizationNamePlaceholder}
      bind:value={object.name}
      kind={'large-style'}
      autoFocus
      focusIndex={1}
    />
  </div>

  <AttachmentStyledBox
    bind:this={descriptionBox}
    objectId={id}
    _class={contact.class.Organization}
    space={contact.space.Contacts}
    alwaysEdit
    showButtons={false}
    bind:content={description}
    placeholder={core.string.Description}
    kind="indented"
    isScrollable={false}
    enableBackReferences={true}
    enableAttachments={false}
    on:attachments={(ev) => {
      if (ev.detail.size > 0) attachments = ev.detail.values
      else if (ev.detail.size === 0 && ev.detail.values != null) {
        attachments.clear()
        attachments = attachments
      }
    }}
  />

  <svelte:fragment slot="pool">
    <ChannelsDropdown
      bind:value={channels}
      focusIndex={10}
      kind={'regular'}
      size={'large'}
      editable
      highlighted={matchedChannels.map((it) => it.provider)}
    />

    <InlineAttributeBar
      _class={contact.class.Organization}
      {object}
      toClass={contact.class.Contact}
      on:update
      extraProps={{ showNavigate: false }}
    />
  </svelte:fragment>

  <svelte:fragment slot="attachments">
    {#if attachments.size > 0}
      {#each Array.from(attachments.values()) as attachment}
        <AttachmentPresenter
          value={attachment}
          showPreview
          removable
          on:remove={(result) => {
            if (result.detail !== undefined) descriptionBox.removeAttachmentById(result.detail._id)
          }}
        />
      {/each}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      size="large"
      on:click={() => {
        descriptionBox.handleAttach()
      }}
    />
    {#if matches.length > 0}
      <div class="flex-row-center error-color">
        <IconInfo size={'small'} />
        <span class="text-sm overflow-label ml-2">
          <Label label={contact.string.PersonAlreadyExists} />
        </span>
        <div class="ml-4"><OrganizationPresenter value={matches[0]} /></div>
      </div>
    {/if}
  </svelte:fragment>
</Card>
