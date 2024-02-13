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
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, Scroller } from '@hcengineering/ui'
  import activity from '@hcengineering/activity'
  import view from '@hcengineering/view'
  import { getResource } from '@hcengineering/platform'

  import ChatNavItem from './ChatNavGroupItem.svelte'
  import ChatGroupHeader from './ChatGroupHeader.svelte'
  import chunter from '../../../plugin'
  import { ChatNavGroupModel } from '../types'

  export let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  export let model: ChatNavGroupModel

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const contextsQuery = createQuery()
  const pinnedQuery = createQuery()

  let contexts: DocNotifyContext[] = []
  let pinnedContexts: DocNotifyContext[] = []

  $: contextsQuery.query(
    notification.class.DocNotifyContext,
    {
      ...model.query,
      hidden: false,
      isPinned: { $ne: true },
      user: getCurrentAccount()._id
    },
    (res: DocNotifyContext[]) => {
      contexts = sortContexts(
        res.filter(
          ({ attachedToClass }) =>
            hierarchy.classHierarchyMixin(attachedToClass, activity.mixin.ActivityDoc) !== undefined
        )
      )
    }
  )

  $: pinnedQuery.query(
    notification.class.DocNotifyContext,
    {
      ...model.query,
      hidden: false,
      isPinned: true,
      user: getCurrentAccount()._id
    },
    (res: DocNotifyContext[]) => {
      pinnedContexts = res
    }
  )

  function getPinnedActions (): Action[] {
    return [
      {
        icon: view.icon.Delete,
        label: view.string.Delete,
        action: chunter.actionImpl.UnpinAllChannels
      }
    ].map(({ icon, label, action }) => ({
      icon,
      label,
      action: async (_: any, evt: Event) => {
        const actionFn = await getResource(action)
        await actionFn(pinnedContexts, evt)
      }
    }))
  }

  function sortContexts (contexts: DocNotifyContext[]): DocNotifyContext[] {
    if (model.id !== 'activity') {
      return contexts
    }
    return contexts.sort((context1, context2) => {
      const hasNewMessages1 = (context1.lastUpdateTimestamp ?? 0) > (context1.lastViewedTimestamp ?? 0)
      const hasNewMessages2 = (context2.lastUpdateTimestamp ?? 0) > (context2.lastViewedTimestamp ?? 0)

      if (hasNewMessages1 && hasNewMessages2) {
        return (context2.lastUpdateTimestamp ?? 0) - (context1.lastUpdateTimestamp ?? 0)
      }

      if (hasNewMessages1 && !hasNewMessages2) {
        return -1
      }

      if (hasNewMessages2 && !hasNewMessages1) {
        return 1
      }

      return (context2.lastUpdateTimestamp ?? 0) - (context1.lastUpdateTimestamp ?? 0)
    })
  }
</script>

<Scroller padding="0 0.5rem">
  {#if pinnedContexts.length}
    <div class="block">
      <ChatGroupHeader header={chunter.string.Pinned} actions={getPinnedActions()} />
      {#each pinnedContexts as context (context._id)}
        <ChatNavItem {context} isSelected={selectedContextId === context._id} on:select />
      {/each}
    </div>
  {/if}

  {#if pinnedContexts.length > 0 && contexts.length}
    <div class="separator" />
  {/if}

  <div class="block">
    <ChatGroupHeader header={model.label} />
    {#each contexts as context (context._id)}
      <ChatNavItem {context} isSelected={selectedContextId === context._id} on:select />
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .block {
    display: flex;
    flex-direction: column;
  }

  .separator {
    width: 100%;
    height: 1px;
    background: var(--theme-navpanel-border);
    margin-top: 0.75rem;
  }
</style>
