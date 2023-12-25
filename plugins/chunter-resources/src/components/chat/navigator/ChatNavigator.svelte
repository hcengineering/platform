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
  import { Ref } from '@hcengineering/core'
  import { Scroller } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { SpecialNavModel } from '@hcengineering/workbench'
  import { NavLink } from '@hcengineering/view-resources'
  import { SpecialElement, TreeSeparator } from '@hcengineering/workbench-resources'
  import { getResource } from '@hcengineering/platform'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'

  import ChatNavGroup from './ChatNavGroup.svelte'
  import { chatNavGroups, chatSpecials } from '../utils'

  export let selectedContextId: Ref<DocNotifyContext> | undefined
  export let currentSpecial: SpecialNavModel | undefined

  const notificationClient = InboxNotificationsClientImpl.getClient()

  let notifyContexts: DocNotifyContext[] = []

  notificationClient.docNotifyContexts.subscribe((res) => {
    notifyContexts = res
  })

  async function isSpecialVisible (special: SpecialNavModel, docNotifyContexts: DocNotifyContext[]) {
    if (special.visibleIf === undefined) {
      return true
    }

    const getIsVisible = await getResource(special.visibleIf)

    return await getIsVisible(docNotifyContexts as any)
  }

  const menuSelection: boolean = false
</script>

<!--TODO: hasSpaceBrowser-->
<Scroller shrink>
  {#each chatSpecials as special, row}
    {#if row > 0 && chatSpecials[row].position !== chatSpecials[row - 1].position}
      <TreeSeparator line />
    {/if}
    {#await isSpecialVisible(special, notifyContexts) then isVisible}
      {#if isVisible}
        <NavLink space={special.id}>
          <SpecialElement
            label={special.label}
            icon={special.icon}
            selected={menuSelection ? false : special.id === currentSpecial?.id}
          />
        </NavLink>
      {/if}
    {/await}
  {/each}

  {#each chatNavGroups as model}
    <ChatNavGroup {selectedContextId} {model} on:open />
  {/each}
  <div class="antiNav-space" />
</Scroller>
