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
  import { Doc, Ref } from '@hcengineering/core'
  import { Scroller, SearchEdit, Label, Button, IconAdd, showPopup, Menu } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { SpecialNavModel } from '@hcengineering/workbench'
  import { NavLink } from '@hcengineering/view-resources'
  import { TreeSeparator } from '@hcengineering/workbench-resources'
  import { getResource } from '@hcengineering/platform'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'

  import chunter from '../../../plugin'
  import ChatNavGroup from './ChatNavGroup.svelte'
  import { chatNavGroupModels, chatSpecials } from '../utils'
  import ChatSpecialElement from './ChatSpecialElement.svelte'
  import { userSearch } from '../../../index'
  import { navigateToSpecial } from '../../../navigation'

  export let objectId: Ref<Doc> | undefined
  export let object: Doc | undefined
  export let currentSpecial: SpecialNavModel | undefined

  const notificationClient = InboxNotificationsClientImpl.getClient()
  const contextsStore = notificationClient.contexts

  const globalActions = [
    {
      label: chunter.string.NewChannel,
      icon: chunter.icon.Hashtag,
      action: async (): Promise<void> => {
        showPopup(chunter.component.CreateChannel, {}, 'top')
      }
    },
    {
      label: chunter.string.NewDirectChat,
      icon: chunter.icon.Thread,
      action: async (): Promise<void> => {
        showPopup(chunter.component.CreateDirectChat, {}, 'top')
      }
    }
  ]

  const searchValue: string = ''

  async function isSpecialVisible (special: SpecialNavModel, contexts: DocNotifyContext[]): Promise<boolean> {
    if (special.visibleIf === undefined) {
      return true
    }

    const getIsVisible = await getResource(special.visibleIf)

    return await getIsVisible(contexts as any)
  }

  function addButtonClicked (ev: MouseEvent): void {
    showPopup(Menu, { actions: globalActions }, ev.target as HTMLElement)
  }
</script>

<Scroller shrink>
  <div class="header">
    <div class="overflow-label">
      <Label label={chunter.string.Chat} />
    </div>
    <Button icon={IconAdd} kind="primary" size="medium" iconProps={{ size: 'small' }} on:click={addButtonClicked} />
  </div>

  {#each chatSpecials as special, row}
    {#if row > 0 && chatSpecials[row].position !== chatSpecials[row - 1].position}
      <TreeSeparator line />
    {/if}
    {#await isSpecialVisible(special, $contextsStore) then isVisible}
      {#if isVisible}
        <NavLink space={special.id}>
          <ChatSpecialElement {special} {currentSpecial} />
        </NavLink>
      {/if}
    {/await}
  {/each}

  <div class="search">
    <SearchEdit
      value={searchValue}
      width="auto"
      on:change={(ev) => {
        userSearch.set(ev.detail)

        if (ev.detail !== '') {
          navigateToSpecial('chunterBrowser')
        }
      }}
    />
  </div>
  <Scroller>
    {#each chatNavGroupModels as model}
      <ChatNavGroup {object} {objectId} {model} on:select />
    {/each}
    <div class="antiNav-space" />
  </Scroller>
</Scroller>

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.75rem;
    margin-left: 1.25rem;
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--global-primary-TextColor);
  }
  .search {
    padding: var(--spacing-1_5);
    border-bottom: 1px solid var(--global-surface-02-BorderColor);
  }
</style>
