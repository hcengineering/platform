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
  import { createEventDispatcher } from 'svelte'
  import type { Doc, Ref } from '@hcengineering/core'
  import { getCurrentAccount } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Action, IconAdd, showPopup } from '@hcengineering/ui'
  import { TreeNode } from '@hcengineering/view-resources'

  import { getDocByNotifyContext } from '../utils'
  import { ChatNavGroupModel } from '../types'
  import ChatNavItem from './ChatNavItem.svelte'

  export let model: ChatNavGroupModel
  export let selectedContextId: Ref<DocNotifyContext> | undefined = undefined

  const dispatch = createEventDispatcher()

  const notifyContextsQuery = createQuery()

  let notifyContexts: DocNotifyContext[] = []
  let docByNotifyContext: Map<Ref<DocNotifyContext>, Doc> = new Map<Ref<DocNotifyContext>, Doc>()

  notifyContextsQuery.query(
    notification.class.DocNotifyContext,
    {
      ...model.query,
      hidden: false,
      user: getCurrentAccount()._id
    },
    (res: DocNotifyContext[]) => {
      notifyContexts = res
    }
  )

  $: getDocByNotifyContext(notifyContexts).then((res) => {
    docByNotifyContext = res
  })

  function getGroupActions (): Action[] {
    const result: Action[] = []

    if (model.addLabel !== undefined && model.addComponent !== undefined) {
      result.push({
        label: model.addLabel,
        icon: IconAdd,
        action: async (_id: Ref<Doc>): Promise<void> => {
          dispatch('open')
          if (model.addComponent !== undefined) {
            showPopup(model.addComponent, {}, 'top')
          }
        }
      })
    }

    const additionalActions = model.actions?.map(({ icon, label, action }) => ({
      icon,
      label,
      action: async (ctx: any, evt: Event) => {
        const impl = await getResource(action)
        await impl(notifyContexts, evt)
      }
    }))

    return additionalActions ? result.concat(additionalActions) : result
  }
</script>

{#if !model.hideEmpty || notifyContexts.length > 0}
  <TreeNode _id={`tree-${model.id}`} label={model.label} node actions={async () => getGroupActions()}>
    {#each notifyContexts as docNotifyContext}
      {@const doc = docByNotifyContext.get(docNotifyContext._id)}
      {#if doc}
        {#key docNotifyContext._id}
          <ChatNavItem {doc} notifyContext={docNotifyContext} {selectedContextId} />
        {/key}
      {/if}
    {/each}
  </TreeNode>
{/if}
