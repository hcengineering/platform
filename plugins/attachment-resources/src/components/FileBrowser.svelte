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
  import contact, { getCurrentEmployee, Person } from '@hcengineering/contact'
  import core, { Class, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Loading, navigate, TabList, getLocation } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { dateFileBrowserFilters, FileBrowserSortMode, fileTypeFileBrowserFilters, sortModeToOptionObject } from '..'
  import attachment from '../plugin'
  import AttachmentsGalleryView from './AttachmentsGalleryView.svelte'
  import AttachmentsListView from './AttachmentsListView.svelte'
  import FileBrowserFilters from './FileBrowserFilters.svelte'
  import FileBrowserSortMenu from './FileBrowserSortMenu.svelte'

  export let withHeader: boolean = true

  const client = getClient()
  const loc = getLocation()
  const spaceId: Ref<Space> | undefined = loc.query?.spaceId as Ref<Space> | undefined

  $: if (spaceId !== undefined) {
    const loc = getLocation()
    loc.query = undefined
    navigate(loc, true)
  }
  export let requestedSpaceClasses: Ref<Class<Space>>[] = []
  const currentEmployee = getCurrentEmployee()
  let selectedParticipants: Ref<Person>[] = [currentEmployee]
  let selectedSpaces: Ref<Space>[] = []
  export let search: string = ''
  let isLoading = false

  let attachments: Attachment[] = []

  let selectedSort: FileBrowserSortMode = FileBrowserSortMode.NewestFile
  let selectedDateId = 'dateAny'
  let selectedFileTypeId = 'typeAny'
  let isListDisplayMode = true

  $: fetch(search, selectedSort, selectedFileTypeId, selectedDateId, selectedParticipants, selectedSpaces)

  async function fetch (
    searchQuery_: string,
    selectedSort_: FileBrowserSortMode,
    selectedFileTypeId_: string,
    selectedDateId_: string,
    selectedParticipants_: Ref<Person>[],
    selectedSpaces_: Ref<Space>[]
  ) {
    isLoading = true

    const nameQuery = searchQuery_ ? { name: { $like: '%' + searchQuery_ + '%' } } : {}

    const allSocialIds = await client.findAll(contact.class.SocialIdentity, {
      attachedTo: { $in: selectedParticipants_ },
      attachedToClass: contact.class.Person
    })
    const senderQuery = allSocialIds.length !== 0 ? { modifiedBy: { $in: allSocialIds.map((si) => si.key) } } : {}

    let spaceQuery: { space: any }
    if (selectedSpaces_.length > 0) {
      spaceQuery = { space: { $in: selectedSpaces_ } }
    } else {
      // nothing is selected in space filter - show all available attachments (except for the archived channels)
      const allSpaces = await client.findAll(core.class.Space, {
        archived: false,
        _class: { $in: requestedSpaceClasses }
      })
      const availableSpaces = allSpaces.map((sp) => sp._id)
      spaceQuery = { space: { $in: availableSpaces } }
    }

    const date = dateFileBrowserFilters.find((o) => o.id === selectedDateId_)?.getDate()
    const dateQuery = date && { modifiedOn: date }

    const fileType = fileTypeFileBrowserFilters.find((o) => o.id === selectedFileTypeId_)?.getType()
    const fileTypeQuery = fileType && { type: fileType }

    attachments = await client.findAll(
      attachment.class.Attachment,
      { ...nameQuery, ...senderQuery, ...spaceQuery, ...dateQuery, ...fileTypeQuery },
      {
        sort: sortModeToOptionObject(selectedSort_),
        limit: 200
      }
    )
    isLoading = false
  }
</script>

{#if withHeader}
  <div class="ac-header full divide caption-height">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title"><Label label={attachment.string.FileBrowser} /></span>
    </div>
    <div class="mb-1 clear-mins">
      <TabList
        items={[
          { id: 'table', icon: view.icon.Table, tooltip: attachment.string.FileBrowserListView },
          { id: 'card', icon: view.icon.Card, tooltip: attachment.string.FileBrowserGridView }
        ]}
        selected={isListDisplayMode ? 'table' : 'card'}
        on:select={(result) => {
          if (result.detail !== undefined) isListDisplayMode = result.detail === 'table'
        }}
      />
    </div>
  </div>
{/if}
<div class="hulyHeader-container background-comp-header-color">
  <FileBrowserFilters
    {requestedSpaceClasses}
    bind:selectedParticipants
    bind:selectedSpaces
    bind:selectedDateId
    bind:selectedFileTypeId
  />
</div>
<div class="hulyHeader-container justify-between">
  <span class="caption-color ml-4">
    <Label label={attachment.string.FileBrowserFileCounter} params={{ results: attachments?.length ?? 0 }} />
  </span>
  <FileBrowserSortMenu bind:selectedSort />
</div>
<div class="group">
  {#if isLoading}
    <div class="flex-grow">
      <Loading />
    </div>
  {:else if attachments?.length}
    {#if isListDisplayMode}
      <AttachmentsListView {attachments} />
    {:else}
      <AttachmentsGalleryView {attachments} />
    {/if}
  {:else}
    <div class="flex-between ml-6">
      <Label label={attachment.string.NoFiles} />
    </div>
  {/if}
</div>

<style lang="scss">
  .group {
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding: 1rem 0 1rem 0.5rem;
    height: 100%;
  }
</style>
