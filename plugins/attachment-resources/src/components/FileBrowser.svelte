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
  import { Attachment } from '@anticrm/attachment'
  import contact, { Employee } from '@anticrm/contact'
  import { EmployeeAccount } from '@anticrm/contact'
  import core, { Class, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import view from '@anticrm/view'
  import { getClient } from '@anticrm/presentation'
  import ui, {
    getCurrentLocation,
    location,
    IconSearch,
    Label,
    navigate,
    EditWithIcon,
    Spinner,
    Tooltip,
    Icon
  } from '@anticrm/ui'
  import { onDestroy } from 'svelte'
  import { FileBrowserSortMode, dateFileBrowserFilters, fileTypeFileBrowserFilters, sortModeToOptionObject } from '..'
  import attachment from '../plugin'
  import AttachmentsGalleryView from './AttachmentsGalleryView.svelte'
  import AttachmentsListView from './AttachmentsListView.svelte'
  import FileBrowserFilters from './FileBrowserFilters.svelte'
  import FileBrowserSortMenu from './FileBrowserSortMenu.svelte'

  const client = getClient()
  const loc = getCurrentLocation()
  const spaceId: Ref<Space> | undefined = loc.query?.spaceId as Ref<Space> | undefined
  export let requestedSpaceClasses: Ref<Class<Space>>[] = []
  const currentUser = getCurrentAccount() as EmployeeAccount
  let selectedParticipants: Ref<Employee>[] = [currentUser.employee]
  let selectedSpaces: Ref<Space>[] = []
  let searchQuery: string = ''
  let isLoading = false

  let attachments: Attachment[] = []

  let selectedSort: FileBrowserSortMode = FileBrowserSortMode.NewestFile
  let selectedDateId = 'dateAny'
  let selectedFileTypeId = 'typeAny'
  let isListDisplayMode = true

  $: fetch(searchQuery, selectedSort, selectedFileTypeId, selectedDateId, selectedParticipants, selectedSpaces)

  async function fetch (
    searchQuery_: string,
    selectedSort_: FileBrowserSortMode,
    selectedFileTypeId_: string,
    selectedDateId_: string,
    selectedParticipants_: Ref<Employee>[],
    selectedSpaces_: Ref<Space>[]
  ) {
    isLoading = true

    const nameQuery = searchQuery_ ? { name: { $like: '%' + searchQuery_ + '%' } } : {}

    const accounts = await client.findAll(contact.class.EmployeeAccount, { employee: { $in: selectedParticipants_ } })
    const senderQuery = accounts.length ? { modifiedBy: { $in: accounts.map((a) => a._id) } } : {}

    let spaceQuery: { space: any }
    if (selectedSpaces_.length) {
      spaceQuery = { space: { $in: selectedSpaces_ } }
    } else {
      // nothing is selected in space filter - show all available attachments (except for the archived channels)
      const allSpaces = await client.findAll(core.class.Space, {
        archived: false,
        _class: { $in: requestedSpaceClasses }
      })
      const availableSpaces = allSpaces
        .filter((sp) => !sp.private || sp.members.includes(currentUser._id))
        .map((sp) => sp._id)
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

  onDestroy(
    location.subscribe(async (loc) => {
      loc.query = undefined
      navigate(loc)
    })
  )
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={attachment.string.FileBrowser} /></span>
  </div>
  <EditWithIcon icon={IconSearch} bind:value={searchQuery} placeholder={ui.string.SearchDots} />
</div>
<div class="ac-header full">
  <FileBrowserFilters
    {requestedSpaceClasses}
    {spaceId}
    bind:selectedParticipants
    bind:selectedSpaces
    bind:selectedDateId
    bind:selectedFileTypeId
  />
  <div class="flex">
    <Tooltip label={attachment.string.FileBrowserListView} direction={'bottom'}>
      <button
        class="ac-header__icon-button"
        class:selected={isListDisplayMode}
        on:click={() => {
          isListDisplayMode = true
        }}
      >
        <Icon icon={view.icon.Table} size={'small'} />
      </button>
    </Tooltip>
    <Tooltip label={attachment.string.FileBrowserGridView} direction={'bottom'}>
      <button
        class="ac-header__icon-button"
        class:selected={!isListDisplayMode}
        on:click={() => {
          isListDisplayMode = false
        }}
      >
        <Icon icon={view.icon.Card} size={'small'} />
      </button>
    </Tooltip>
  </div>
</div>
<div class="group">
  <div class="groupHeader">
    <div class="eGroupHeaderCount">
      <Label label={attachment.string.FileBrowserFileCounter} params={{ results: attachments?.length ?? 0 }} />
    </div>
    <FileBrowserSortMenu bind:selectedSort />
  </div>
  {#if isLoading}
    <div class="ml-4">
      <Spinner />
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
    padding: 1rem 0;
    overflow: auto;
  }

  .groupHeader {
    margin: 0 1.5rem 0.75rem 1.5rem;
    display: flex;
    justify-content: space-between;

    .eGroupHeaderCount {
      font-size: 0.75rem;
      color: var(--theme-caption-color);
    }
  }
</style>
