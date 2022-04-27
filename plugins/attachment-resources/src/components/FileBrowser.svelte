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
  import { Class, Doc, getCurrentAccount, Ref, SortingOrder, SortingQuery, Space } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { getClient, SpaceMultiBoxList, UserBoxList } from '@anticrm/presentation'
  import ui, {
    DropdownLabelsIntl,
    getCurrentLocation,
    location,
    IconMoreV,
    IconSearch,
    Label,
    Menu as UIMenu,
    showPopup,
    navigate,
    EditWithIcon,
    Spinner
  } from '@anticrm/ui'
  import { Menu } from '@anticrm/view-resources'
  import { onDestroy } from 'svelte'
  import { AttachmentPresenter, SortMode } from '..'
  import attachment from '../plugin'

  const msInDay = 24 * 60 * 60 * 1000
  const getBeginningOfDate = (customDate?: Date) => {
    if (!customDate) {
      customDate = new Date()
    }
    customDate.setUTCHours(0, 0, 0, 0)
    return customDate.getTime()
  }

  const dateObjects = [
    {
      id: 'dateAny',
      label: attachment.string.FileBrowserDateFilterAny,
      getDate: () => {
        return undefined
      }
    },
    {
      id: 'dateToday',
      label: attachment.string.FileBrowserDateFilterToday,
      getDate: () => {
        return { $gte: getBeginningOfDate() }
      }
    },
    {
      id: 'dateYesterday',
      label: attachment.string.FileBrowserDateFilterYesterday,
      getDate: () => {
        return { $gte: getBeginningOfDate() - msInDay, $lt: getBeginningOfDate() }
      }
    },
    {
      id: 'date7Days',
      label: attachment.string.FileBrowserDateFilter7Days,
      getDate: () => {
        return { $gte: getBeginningOfDate() - msInDay * 6 }
      }
    },
    {
      id: 'date30Days',
      label: attachment.string.FileBrowserDateFilter30Days,
      getDate: () => {
        return { $gte: getBeginningOfDate() - msInDay * 29 }
      }
    },
    {
      id: 'date3Months',
      label: attachment.string.FileBrowserDateFilter3Months,
      getDate: () => {
        const now = new Date()
        now.setMonth(now.getMonth() - 3)
        return { $gte: getBeginningOfDate(now) }
      }
    },
    {
      id: 'date12Months',
      label: attachment.string.FileBrowserDateFilter12Months,
      getDate: () => {
        const now = new Date()
        now.setMonth(now.getMonth() - 12)
        return { $gte: getBeginningOfDate(now) }
      }
    }
  ]

  const fileTypeObjects = [
    {
      id: 'typeAny',
      label: attachment.string.FileBrowserTypeFilterAny,
      getType: () => {
        return undefined
      }
    },
    {
      id: 'typeImage',
      label: attachment.string.FileBrowserTypeFilterImages,
      getType: () => {
        return { $like: '%image/%' }
      }
    },
    {
      id: 'typeAudio',
      label: attachment.string.FileBrowserTypeFilterAudio,
      getType: () => {
        return { $like: '%audio/%' }
      }
    },
    {
      id: 'typeVideo',
      label: attachment.string.FileBrowserTypeFilterVideos,
      getType: () => {
        return { $like: '%video/%' }
      }
    },
    {
      id: 'typePDF',
      label: attachment.string.FileBrowserTypeFilterPDFs,
      getType: () => {
        return 'application/pdf'
      }
    }
  ]

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
  let selectedFileNumber: number | undefined

  let selectedSort: SortMode = SortMode.NewestFile
  let selectedDateId = 'dateAny'
  let selectedFileTypeId = 'typeAny'

  const showFileMenu = async (ev: MouseEvent, object: Doc, fileNumber: number): Promise<void> => {
    selectedFileNumber = fileNumber
    showPopup(Menu, { object }, ev.target as HTMLElement, () => {
      selectedFileNumber = undefined
    })
  }

  const showSortMenu = async (ev: Event): Promise<void> => {
    showPopup(
      UIMenu,
      {
        actions: [
          {
            label: sortModeToString(SortMode.NewestFile),
            action: () => {
              selectedSort = SortMode.NewestFile
            }
          },
          {
            label: sortModeToString(SortMode.OldestFile),
            action: () => {
              selectedSort = SortMode.OldestFile
            }
          },
          {
            label: sortModeToString(SortMode.AscendingAlphabetical),
            action: () => {
              selectedSort = SortMode.AscendingAlphabetical
            }
          },
          {
            label: sortModeToString(SortMode.DescendingAlphabetical),
            action: () => {
              selectedSort = SortMode.DescendingAlphabetical
            }
          }
        ]
      },
      ev.target as HTMLElement
    )
  }

  const sortModeToString = (sortMode: SortMode): IntlString<{}> => {
    switch (sortMode) {
      case SortMode.NewestFile:
        return attachment.string.FileBrowserSortNewest
      case SortMode.OldestFile:
        return attachment.string.FileBrowserSortOldest
      case SortMode.AscendingAlphabetical:
        return attachment.string.FileBrowserSortAZ
      case SortMode.DescendingAlphabetical:
        return attachment.string.FileBrowserSortZA
    }
  }

  const sortModeToOptionObject = (sortMode: SortMode): SortingQuery<Attachment> => {
    switch (sortMode) {
      case SortMode.NewestFile:
        return { modifiedOn: SortingOrder.Descending }
      case SortMode.OldestFile:
        return { modifiedOn: SortingOrder.Ascending }
      case SortMode.AscendingAlphabetical:
        return { name: SortingOrder.Ascending }
      case SortMode.DescendingAlphabetical:
        return { name: SortingOrder.Descending }
    }
  }

  $: fetch(searchQuery, selectedSort, selectedFileTypeId, selectedDateId, selectedParticipants, selectedSpaces)

  async function fetch (
    searchQuery_: string,
    selectedSort_: SortMode,
    selectedFileTypeId_: string,
    selectedDateId_: string,
    selectedParticipants_: Ref<Employee>[],
    selectedSpaces_: Ref<Space>[]
  ) {
    isLoading = true

    const nameQuery = searchQuery_ ? { name: { $like: '%' + searchQuery_ + '%' } } : {}

    const accounts = await client.findAll(contact.class.EmployeeAccount, { employee: { $in: selectedParticipants_ } })
    const senderQuery = accounts.length ? { modifiedBy: { $in: accounts.map((a) => a._id) } } : {}

    const spaceQuery = selectedSpaces_.length ? { space: { $in: selectedSpaces_ } } : {}

    const date = dateObjects.find((o) => o.id === selectedDateId_)?.getDate()
    const dateQuery = date && { modifiedOn: date }

    const fileType = fileTypeObjects.find((o) => o.id === selectedFileTypeId_)?.getType()
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
<div class="filterBlockContainer">
  <div class="simpleFilterButton">
    <UserBoxList
      _class={contact.class.Employee}
      items={selectedParticipants}
      label={attachment.string.FileBrowserFilterFrom}
      on:update={(evt) => {
        selectedParticipants = evt.detail
      }}
      noItems={attachment.string.NoParticipants}
    />
  </div>
  <div class="simpleFilterButton">
    <SpaceMultiBoxList
      _classes={requestedSpaceClasses}
      label={attachment.string.FileBrowserFilterIn}
      selectedItems={spaceId ? [spaceId] : []}
      on:update={(evt) => {
        selectedSpaces = evt.detail
      }}
    />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabelsIntl
      items={dateObjects}
      placeholder={attachment.string.FileBrowserFilterDate}
      label={attachment.string.FileBrowserFilterDate}
      bind:selected={selectedDateId}
    />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabelsIntl
      items={fileTypeObjects}
      placeholder={attachment.string.FileBrowserFilterFileType}
      label={attachment.string.FileBrowserFilterFileType}
      bind:selected={selectedFileTypeId}
    />
  </div>
</div>
<div class="group">
  <div class="groupHeader">
    <div class="eGroupHeaderCount">
      <Label label={attachment.string.FileBrowserFileCounter} params={{ results: attachments?.length ?? 0 }} />
    </div>
    <div class="eGroupHeaderSortMenu" on:click={(event) => showSortMenu(event)}>
      <Label label={attachment.string.FileBrowserSort} />
      <Label label={sortModeToString(selectedSort)} />
    </div>
  </div>
  {#if isLoading}
    <div class="ml-4">
      <Spinner />
    </div>
  {:else if attachments?.length}
    <div class="flex-col">
      {#each attachments as attachment, i}
        <div class="flex-between attachmentRow" class:fixed={i === selectedFileNumber}>
          <div class="item flex">
            <AttachmentPresenter value={attachment} />
          </div>
          <div class="eAttachmentRowActions" class:fixed={i === selectedFileNumber}>
            <div id="context-menu" class="eAttachmentRowMenu" on:click={(event) => showFileMenu(event, attachment, i)}>
              <IconMoreV size={'small'} />
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex-between attachmentRow">
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

    .eGroupHeaderSortMenu {
      cursor: pointer;
    }
  }

  .attachmentRow {
    display: flex;
    align-items: center;
    padding-right: 1rem;
    margin: 0 1.5rem;
    padding: 0.25rem 0;

    .eAttachmentRowActions {
      visibility: hidden;
      border: 1px solid var(--theme-bg-focused-border);
      padding: 0.2rem;
      border-radius: 0.375rem;
    }

    .eAttachmentRowMenu {
      visibility: hidden;
      opacity: 0.6;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }

    &:hover {
      .eAttachmentRowActions {
        visibility: visible;
      }
      .eAttachmentRowMenu {
        visibility: visible;
      }
    }
    &.fixed {
      .eAttachmentRowActions {
        visibility: visible;
      }
      .eAttachmentRowMenu {
        visibility: visible;
      }
    }
  }

  .filterBlockContainer {
    display: flex;
    flex-flow: row wrap;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .simpleFilterButton {
    max-width: 12rem;
    margin-left: 0.75rem;
  }
</style>
