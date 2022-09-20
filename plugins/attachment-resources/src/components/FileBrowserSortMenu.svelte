<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { Label, Menu, showPopup } from '@hcengineering/ui'
  import { FileBrowserSortMode } from '..'
  import attachment from '../plugin'

  export let selectedSort: FileBrowserSortMode

  const sortModeToString = (sortMode: FileBrowserSortMode): IntlString<{}> => {
    switch (sortMode) {
      case FileBrowserSortMode.NewestFile:
        return attachment.string.FileBrowserSortNewest
      case FileBrowserSortMode.OldestFile:
        return attachment.string.FileBrowserSortOldest
      case FileBrowserSortMode.AscendingAlphabetical:
        return attachment.string.FileBrowserSortAZ
      case FileBrowserSortMode.DescendingAlphabetical:
        return attachment.string.FileBrowserSortZA
      case FileBrowserSortMode.SmallestSize:
        return attachment.string.FileBrowserSortSmallest
      case FileBrowserSortMode.BiggestSize:
        return attachment.string.FileBrowserSortBiggest
    }
  }

  const showSortMenu = async (ev: Event): Promise<void> => {
    showPopup(
      Menu,
      {
        actions: [
          {
            label: sortModeToString(FileBrowserSortMode.NewestFile),
            action: () => {
              selectedSort = FileBrowserSortMode.NewestFile
            }
          },
          {
            label: sortModeToString(FileBrowserSortMode.OldestFile),
            action: () => {
              selectedSort = FileBrowserSortMode.OldestFile
            }
          },
          {
            label: sortModeToString(FileBrowserSortMode.AscendingAlphabetical),
            action: () => {
              selectedSort = FileBrowserSortMode.AscendingAlphabetical
            }
          },
          {
            label: sortModeToString(FileBrowserSortMode.DescendingAlphabetical),
            action: () => {
              selectedSort = FileBrowserSortMode.DescendingAlphabetical
            }
          },
          {
            label: sortModeToString(FileBrowserSortMode.SmallestSize),
            action: () => {
              selectedSort = FileBrowserSortMode.SmallestSize
            }
          },
          {
            label: sortModeToString(FileBrowserSortMode.BiggestSize),
            action: () => {
              selectedSort = FileBrowserSortMode.BiggestSize
            }
          }
        ]
      },
      ev.target as HTMLElement
    )
  }
</script>

<div class="sortMenu" on:click={(event) => showSortMenu(event)}>
  <Label label={attachment.string.FileBrowserSort} />
  <Label label={sortModeToString(selectedSort)} />
</div>

<style lang="scss">
  .sortMenu {
    cursor: pointer;
  }
</style>
