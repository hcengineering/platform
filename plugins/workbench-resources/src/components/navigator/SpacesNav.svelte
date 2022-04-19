<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Class, Doc, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Action, AnyComponent, IconAdd, IconEdit, showPanel, showPopup } from '@anticrm/ui'
  import view from '@anticrm/view'
  import preference from '@anticrm/preference'
  import { getActions as getContributedActions } from '@anticrm/view-resources'
  import { SpacesNavModel } from '@anticrm/workbench'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { classIcon } from '../../utils'
  import SpecialElement from './SpecialElement.svelte'
  import TreeItem from './TreeItem.svelte'
  import TreeNode from './TreeNode.svelte'

  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let spaces: Space[]
  export let currentSpecial: string | undefined
  const client = getClient()
  const dispatch = createEventDispatcher()

  const addSpace: Action = {
    label: model.addSpaceLabel,
    icon: IconAdd,
    action: async (_id: Ref<Doc>, ev?: Event): Promise<void> => {
      showPopup(model.createComponent, {}, ev?.target as HTMLElement)
    }
  }

  const editSpace: Action = {
    label: plugin.string.Open,
    icon: IconEdit,
    action: async (_id: Ref<Doc>): Promise<void> => {
      const editor = await getEditor(model.spaceClass)
      showPanel(editor ?? plugin.component.SpacePanel, _id, model.spaceClass, 'right')
    }
  }

  const starSpace: Action = {
    label: preference.string.Star,
    icon: preference.icon.Star,
    action: async (_id: Ref<Space>): Promise<void> => {
      await client.createDoc(preference.class.SpacePreference, preference.space.Preference, {
        attachedTo: _id
      })
    }
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent | undefined> {
    const hierarchy = client.getHierarchy()
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  function selectSpace (id: Ref<Space>, spaceSpecial?: string) {
    dispatch('space', { space: id, spaceSpecial })
  }

  async function getActions (space: Space): Promise<Action[]> {
    const result = [editSpace, starSpace]

    const extraActions = await getContributedActions(client, space, core.class.Space)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (evt: Event) => {
          const impl = await getResource(act.action)
          await impl(space, evt)
        }
      })
    }
    return result
  }

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  const hierarchy = client.getHierarchy()
  $: clazz = hierarchy.getClass(model.spaceClass)
  $: lastEditMixin = hierarchy.as(clazz, notification.mixin.SpaceLastEdit)

  function isChanged (space: Space, lastViews: Map<Ref<Doc>, number>): boolean {
    const field = lastEditMixin?.lastEditField
    const lastView = lastViews.get(space._id)
    if (lastView === undefined || lastView === -1) return false
    if (field === undefined) return false
    const value = (space as any)[field]
    if (isNaN(value)) return false

    return lastView < value
  }
</script>

<TreeNode label={model.label} parent actions={async () => [addSpace]} indent={'ml-2'}>
  {#each spaces as space (space._id)}
    {#if model.specials}
      <TreeNode icon={model.icon} title={space.name} indent={'ml-2'} actions={() => getActions(space)}>
        {#each model.specials as special}
          <SpecialElement
            indent={'ml-4'}
            label={special.label}
            icon={special.icon}
            on:click={() => dispatch('special', special.id)}
            selected={currentSpace === space._id && special.id === currentSpecial}
            on:click={() => {
              selectSpace(space._id, special.id)
            }}
          />
        {/each}
      </TreeNode>
    {:else}
      <TreeItem
        indent={'ml-4'}
        _id={space._id}
        title={space.name}
        icon={classIcon(client, space._class)}
        selected={currentSpace === space._id}
        actions={() => getActions(space)}
        bold={isChanged(space, $lastViews)}
        on:click={() => {
          selectSpace(space._id)
        }}
      />
    {/if}
  {/each}
</TreeNode>
