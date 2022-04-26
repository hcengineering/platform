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
  import { Doc, getCurrentAccount, Ref, SortingOrder, SortingQuery, Space } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { getClient, UserBoxList } from '@anticrm/presentation'
  import { DropdownLabelsIntl, IconMoreV, Label, Menu as UIMenu, showPopup } from '@anticrm/ui'
  import { Menu } from '@anticrm/view-resources'
  import { AttachmentPresenter } from '..'
  import attachment from '../plugin'

  enum SortMode {
    NewestFile,
    OldestFile,
    AscendingAlphabetical,
    DescendingAlphabetical
  }

  const msInDay = 24 * 60 * 60 * 1000
  const myAccId = getCurrentAccount()._id

  const getBeginningOfToday = () => {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    return date.getTime()
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
        return { $gte: getBeginningOfToday() }
      }
    },
    {
      id: 'dateYesterday',
      label: attachment.string.FileBrowserDateFilterYesterday,
      getDate: () => {
        return { $gte: getBeginningOfToday() - msInDay, $lt: getBeginningOfToday() }
      }
    },
    {
      id: 'date7Days',
      label: attachment.string.FileBrowserDateFilter7Days,
      getDate: () => {
        return { $gte: getBeginningOfToday() - msInDay * 6 }
      }
    },
    {
      id: 'date30Days',
      label: attachment.string.FileBrowserDateFilter30Days,
      getDate: () => {
        return { $gte: getBeginningOfToday() - msInDay * 29 }
      }
    },
    {
      id: 'date3Months',
      label: attachment.string.FileBrowserDateFilter3Months,
      getDate: () => {
        return { $gte: getBeginningOfToday() - msInDay * 90 }
      }
    },
    {
      id: 'date12Months',
      label: attachment.string.FileBrowserDateFilter12Months,
      getDate: () => {
        return { $gte: getBeginningOfToday() - msInDay * 364 }
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
  export let space: Space | undefined
  const currentUser = getCurrentAccount() as EmployeeAccount
  let participants: Ref<Employee>[] = [currentUser.employee]
  const assignee: Ref<Employee> | null = null

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

  $: fetch(selectedSort, selectedFileTypeId, selectedDateId)

  async function fetch(selectedSort_: SortMode, selectedFileTypeId_: string, selectedDateId_: string) {
    const spaceQuery = space && { space: space._id }
    const fileType = fileTypeObjects.find((o) => o.id === selectedFileTypeId_)?.getType()
    const typeQuery = fileType && { type: fileType }
    const date = dateObjects.find((o) => o.id === selectedDateId_)?.getDate()
    const dateQuery = date && { modifiedOn: date }

    attachments = await client.findAll(
      attachment.class.Attachment,
      { ...spaceQuery, ...typeQuery, ...dateQuery },
      {
        sort: sortModeToOptionObject(selectedSort_)
      }
    )
  }
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={attachment.string.FileBrowser} /></span>
  </div>
</div>
<div class="filterBlockContainer">
  <div class="simpleFilterButton">
    <UserBoxList
      _class={contact.class.Employee}
      items={participants}
      label={attachment.string.FileBrowserFilterFrom}
      on:update={(evt) => {
        participants = evt.detail
      }}
      noItems={attachment.string.NoParticipants}
    />
  </div>
  <!-- TODO: wait for In filter -->
  <!-- <div class="simpleFilterButton">
    <UserBox _class={contact.class.Employee} label={attachment.string.FileBrowserFilterIn} bind:value={assignee} />
  </div> -->
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
      {'Sort: '}
      <Label label={sortModeToString(selectedSort)} />
    </div>
  </div>
  {#if attachments?.length}
    <div class="flex-col">
      {#each attachments as attachment, i}
        <div class="flex-between attachmentRow" class:fixed={i === selectedFileNumber}>
          <div class="item flex">
            <AttachmentPresenter value={attachment} />
          </div>
          {#if attachment.modifiedBy !== myAccId}
            <div class="eAttachmentRowActions" class:fixed={i === selectedFileNumber}>
              <div
                id="context-menu"
                class="eAttachmentRowMenu"
                on:click={(event) => showFileMenu(event, attachment, i)}
              >
                <IconMoreV size={'small'} />
              </div>
            </div>
          {/if}
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
    border: 1px solid var(--theme-bg-focused-border);
    border-radius: 1rem;
    padding: 1rem 0;
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
    min-width: 4rem;
    max-width: 12rem;
    margin-left: 0.75rem;
  }
</style>
