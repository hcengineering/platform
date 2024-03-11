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
  import { Class, Doc, getCurrentAccount, groupByArray, Ref } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { createQuery, getClient, LiveQuery, MessageBox } from '@hcengineering/presentation'
  import { Action, Scroller, showPopup } from '@hcengineering/ui'
  import activity from '@hcengineering/activity'
  import view from '@hcengineering/view'
  import { getResource } from '@hcengineering/platform'

  import ChatNavItem from './ChatNavGroupItem.svelte'
  import ChatGroupHeader from './ChatGroupHeader.svelte'
  import chunter from '../../../plugin'
  import { ChatNavGroupModel } from '../types'
  import { readActivityChannels, removeActivityChannels } from '../utils'

  export let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  export let model: ChatNavGroupModel

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const allContextsQuery = createQuery()
  const objectsQueryByClass = new Map<Ref<Class<Doc>>, LiveQuery>()

  let objectsByClass = new Map<Ref<Class<Doc>>, Doc[]>()

  let allContexts: DocNotifyContext[] = []
  let contexts: DocNotifyContext[] = []
  let pinnedContexts: DocNotifyContext[] = []

  $: allContextsQuery.query(
    notification.class.DocNotifyContext,
    {
      ...model.query,
      hidden: false,
      user: getCurrentAccount()._id
    },
    (res: DocNotifyContext[]) => {
      allContexts = sortContexts(
        res.filter(
          ({ attachedToClass }) =>
            hierarchy.classHierarchyMixin(attachedToClass, activity.mixin.ActivityDoc) !== undefined
        )
      )
    }
  )

  $: contexts = allContexts.filter(({ isPinned }) => !isPinned)
  $: pinnedContexts = allContexts.filter(({ isPinned }) => isPinned)

  $: loadObjects(allContexts)

  function loadObjects (allContexts: DocNotifyContext[]): void {
    const contextsByClass = groupByArray(allContexts, ({ attachedToClass }) => attachedToClass)

    for (const [_class, contexts] of contextsByClass.entries()) {
      const ids = contexts.map(({ attachedTo }) => attachedTo)
      const query = objectsQueryByClass.get(_class) ?? createQuery()

      objectsQueryByClass.set(_class, query)

      query.query(_class, { _id: { $in: ids } }, (res: Doc[]) => {
        objectsByClass = objectsByClass.set(_class, res)
      })
    }

    for (const [classRef, query] of objectsQueryByClass.entries()) {
      if (!contextsByClass.has(classRef)) {
        query.unsubscribe()
        objectsQueryByClass.delete(classRef)
        objectsByClass.delete(classRef)

        objectsByClass = objectsByClass
      }
    }
  }

  function archiveActivityChannels (contexts: DocNotifyContext[]): void {
    showPopup(
      MessageBox,
      {
        label: chunter.string.ArchiveActivityConfirmationTitle,
        message: chunter.string.ArchiveActivityConfirmationMessage
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          void removeActivityChannels(contexts)
        }
      }
    )
  }

  function getActions (contexts: DocNotifyContext[]): Action[] {
    if (model.id !== 'activity') return []

    return [
      {
        icon: notification.icon.ReadAll,
        label: notification.string.MarkReadAll,
        action: () => readActivityChannels(contexts)
      },
      {
        icon: view.icon.Archive,
        label: notification.string.ArchiveAll,
        action: async () => {
          archiveActivityChannels(contexts)
        }
      }
    ]
  }

  function getPinnedActions (pinnedContexts: DocNotifyContext[]): Action[] {
    const baseActions = getActions(pinnedContexts)
    const actions: Action[] = [
      {
        icon: view.icon.Delete,
        label: chunter.string.UnpinChannels,
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

    return actions.concat(baseActions)
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
      <ChatGroupHeader header={chunter.string.Pinned} actions={getPinnedActions(pinnedContexts)} />
      {#each pinnedContexts as context (context._id)}
        {@const _class = context.attachedToClass}
        {@const object = objectsByClass.get(_class)?.find(({ _id }) => _id === context.attachedTo)}
        <ChatNavItem {context} isSelected={selectedContextId === context._id} doc={object} on:select />
      {/each}
    </div>
  {/if}

  {#if pinnedContexts.length > 0 && contexts.length}
    <div class="separator" />
  {/if}

  {#if contexts.length}
    <div class="block">
      <ChatGroupHeader header={model.label} actions={getActions(contexts)} />
      {#each contexts as context (context._id)}
        {@const _class = context.attachedToClass}
        {@const object = objectsByClass.get(_class)?.find(({ _id }) => _id === context.attachedTo)}
        <ChatNavItem {context} isSelected={selectedContextId === context._id} doc={object} on:select />
      {/each}
    </div>
  {/if}
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
