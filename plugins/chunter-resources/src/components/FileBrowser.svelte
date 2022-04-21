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
  import attachment, { Attachment } from '@anticrm/attachment'
  import { AttachmentPresenter } from '@anticrm/attachment-resources'
  import type { Channel } from '@anticrm/chunter'
  import contact, { Employee } from '@anticrm/contact'
  import { EmployeeAccount } from '@anticrm/contact'
  import { Doc, getCurrentAccount, Ref, SortingOrder, SortingQuery } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { getClient, UserBox, UserBoxList } from '@anticrm/presentation'
  import { DropdownLabels, IconMoreV, Label, Menu as UIMenu, showPopup } from '@anticrm/ui'
  import { Menu } from '@anticrm/view-resources'
  import chunter from '../plugin'

  enum SortMode {
    NewestFile,
    OldestFile,
    AscendingAlphabetical,
    DescendingAlphabetical
  }

  const msInDay = 24 * 60 * 60 * 1000
  const dateObjects = [
    {
      id: '00',
      label: chunter.string.FileBrowserDateFilter0,
      getDate: () => {
        return undefined
      }
    },
    {
      id: '01',
      label: chunter.string.FileBrowserDateFilter1,
      getDate: () => {
        return { $gt: Date.now() - msInDay }
      }
    },
    {
      id: '02',
      label: chunter.string.FileBrowserDateFilter2,
      getDate: () => {
        return { $lt: Date.now() - msInDay, $gt: Date.now() - 2 * msInDay }
      }
    },
    {
      id: '03',
      label: chunter.string.FileBrowserDateFilter3,
      getDate: () => {
        return { $gt: Date.now() - msInDay * 7 }
      }
    },
    {
      id: '04',
      label: chunter.string.FileBrowserDateFilter4,
      getDate: () => {
        return { $gt: Date.now() - msInDay * 30 }
      }
    },
    {
      id: '05',
      label: chunter.string.FileBrowserDateFilter5,
      getDate: () => {
        return { $gt: Date.now() - msInDay * 91 }
      }
    },
    {
      id: '06',
      label: chunter.string.FileBrowserDateFilter6,
      getDate: () => {
        return { $gt: Date.now() - msInDay * 365 }
      }
    },
    {
      id: '07',
      label: '(Last 10 secs - debug option)',
      getDate: () => {
        return { $gt: Date.now() - 1000 * 10 }
      }
    },
    {
      id: '08',
      label: '(Prev 10 secs - debug option)',
      getDate: () => {
        return { $lt: Date.now() - 1000 * 10, $gt: Date.now() - 1000 * 40 }
      }
    }
  ]

  const fileTypeObjects = [
    {
      id: '00',
      label: chunter.string.FileBrowserTypeFilter0,
      getType: () => {
        return undefined
      }
    },
    {
      id: '01',
      label: chunter.string.FileBrowserTypeFilter1,
      getType: () => {
        return { $like: '%image/%' }
      }
    },
    {
      id: '02',
      label: chunter.string.FileBrowserTypeFilter2,
      getType: () => {
        return { $like: '%audio/%' }
      }
    },
    {
      id: '03',
      label: chunter.string.FileBrowserTypeFilter3,
      getType: () => {
        return { $like: '%video/%' }
      }
    },
    {
      id: '04',
      label: chunter.string.FileBrowserTypeFilter4,
      getType: () => {
        return 'application/pdf'
      }
    }
  ]

  const client = getClient()
  export let channel: Channel | undefined
  const currentUser = getCurrentAccount() as EmployeeAccount
  let participants: Ref<Employee>[] = [currentUser.employee]
  let assignee: Ref<Employee> | null = null

  let attachments: Attachment[] = []
  let selectedFileNumber: number | undefined

  let selectedSort: SortMode = SortMode.NewestFile
  let selectedDateId = '00'
  let selectedFileTypeId = '00'

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
        return chunter.string.FileBrowserSortNewest
      case SortMode.OldestFile:
        return chunter.string.FileBrowserSortOldest
      case SortMode.AscendingAlphabetical:
        return chunter.string.FileBrowserSortAZ
      case SortMode.DescendingAlphabetical:
        return chunter.string.FileBrowserSortZA
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

  async function fetch (selectedSort_: SortMode, selectedFileTypeId_: string, selectedDateId_: string) {
    const spaceQuery = channel && { space: channel._id }
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
    <span class="ac-header__title"><Label label={chunter.string.FileBrowser} /></span>
  </div>
</div>
<div class="filterBlockContainer">
  <div class="simpleFilterButton">
    <UserBoxList
      _class={contact.class.Employee}
      items={participants}
      label={chunter.string.FileBrowserFilterFrom}
      on:update={(evt) => {
        participants = evt.detail
      }}
      noItems={chunter.string.AndYou}
    />
  </div>
  <!-- TODO: wait for In filter -->
  <div class="simpleFilterButton">
    <UserBox _class={contact.class.Employee} label={chunter.string.FileBrowserFilterIn} bind:value={assignee} />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabels
      items={dateObjects}
      placeholder={chunter.string.FileBrowserFilterDate}
      label={chunter.string.FileBrowserFilterDate}
      bind:selected={selectedDateId}
    />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabels
      items={fileTypeObjects}
      placeholder={chunter.string.FileBrowserFilterFileType}
      label={chunter.string.FileBrowserFilterFileType}
      bind:selected={selectedFileTypeId}
    />
  </div>
</div>
<div class="group">
  <div class="groupHeader">
    <div class="eGroupHeaderCount">
      <Label label={chunter.string.FileBrowserFileCounter} params={{ results: attachments?.length ?? 0 }} />
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
