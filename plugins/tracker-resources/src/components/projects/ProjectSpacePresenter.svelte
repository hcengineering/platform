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
  import { getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { Project } from '@hcengineering/tracker'
  import { IconWithEmoji } from '@hcengineering/presentation'
  import { getPlatformColorDef, getPlatformColorForTextDef, themeStore, tooltip, type Action } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import tracker from '../../plugin'
  import { NavLink, TreeNode } from '@hcengineering/view-resources'
  import { SpacesNavModel, SpecialNavModel } from '@hcengineering/workbench'
  import { SpecialElement } from '@hcengineering/workbench-resources'

  export let space: Project
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let getActions: (space: Project) => Promise<Action[]> = async () => []
  export let deselect: boolean = false
  export let forciblyСollapsed: boolean = false

  let specials: SpecialNavModel[] = []

  // Hide non-Issues specials (Components / Milestones / Templates) on
  // collab-only projects — the user has read on individual issues via
  // Collaborator records but no membership in the project itself, so
  // those sub-views would be empty and confusing. The Issues sub-view
  // stays because the postgres adapter's collab-OR-branch surfaces the
  // doc-level visibility there.
  $: isCollabOnlyProject = !space.members.includes(getCurrentAccount().uuid)

  async function updateSpecials (model: SpacesNavModel, space: Project): Promise<void> {
    const newSpecials: SpecialNavModel[] = []
    for (const sp of model.specials ?? []) {
      let shouldAdd = true
      if (sp.visibleIf !== undefined) {
        const visibleIf = await getResource(sp.visibleIf)
        if (visibleIf !== undefined) {
          shouldAdd = await visibleIf([space])
        }
      }
      // Filter to Issues only when the caller is not a member; everything
      // else (Components / Milestones / Templates) would render as an
      // empty list and clutter the tree.
      if (shouldAdd && isCollabOnlyProject && sp.id !== 'issues') {
        shouldAdd = false
      }
      if (shouldAdd) {
        newSpecials.push(sp)
      }
    }
    specials = newSpecials
  }

  $: if (model != null) {
    void updateSpecials(model, space)
  }
  $: visible =
    (!deselect && currentSpace !== undefined && currentSpecial !== undefined && space._id === currentSpace) ||
    forciblyСollapsed
</script>

{#if specials}
  {#if isCollabOnlyProject}
    <div use:tooltip={{ label: tracker.string.SharedWithYouTooltip }}>
      <TreeNode
        _id={space?._id}
        icon={space?.icon === view.ids.IconWithEmoji ? IconWithEmoji : (space?.icon ?? model?.icon)}
        iconProps={space?.icon === view.ids.IconWithEmoji
          ? { icon: space.color }
          : {
              fill:
                space.color !== undefined && typeof space.color !== 'string'
                  ? getPlatformColorDef(space.color, $themeStore.dark).icon
                  : getPlatformColorForTextDef(space.name, $themeStore.dark).icon,
              opacity: 0.6
            }}
        title={space.name}
        type={'nested'}
        highlighted={space._id === currentSpace}
        {visible}
        actions={() => getActions(space)}
        {forciblyСollapsed}
      >
        {#each specials as special}
          <NavLink space={space._id} special={special.id}>
            <SpecialElement
              indent
              label={special.label}
              icon={special.icon}
              selected={deselect ? false : currentSpace === space._id && special.id === currentSpecial}
            />
          </NavLink>
        {/each}

        <svelte:fragment slot="visible">
          {#if visible}
            {@const item = specials.find((sp) => sp.id === currentSpecial && currentSpace === space._id)}
            {#if item}
              <NavLink space={space._id} special={item.id}>
                <SpecialElement indent label={item.label} icon={item.icon} selected forciblyСollapsed />
              </NavLink>
            {/if}
          {/if}
        </svelte:fragment>
      </TreeNode>
    </div>
  {:else}
    <TreeNode
      _id={space?._id}
      icon={space?.icon === view.ids.IconWithEmoji ? IconWithEmoji : (space?.icon ?? model?.icon)}
      iconProps={space?.icon === view.ids.IconWithEmoji
        ? { icon: space.color }
        : {
            fill:
              space.color !== undefined && typeof space.color !== 'string'
                ? getPlatformColorDef(space.color, $themeStore.dark).icon
                : getPlatformColorForTextDef(space.name, $themeStore.dark).icon
          }}
      title={space.name}
      type={'nested'}
      highlighted={space._id === currentSpace}
      {visible}
      actions={() => getActions(space)}
      {forciblyСollapsed}
    >
      {#each specials as special}
        <NavLink space={space._id} special={special.id}>
          <SpecialElement
            indent
            label={special.label}
            icon={special.icon}
            selected={deselect ? false : currentSpace === space._id && special.id === currentSpecial}
          />
        </NavLink>
      {/each}

      <svelte:fragment slot="visible">
        {#if visible}
          {@const item = specials.find((sp) => sp.id === currentSpecial && currentSpace === space._id)}
          {#if item}
            <NavLink space={space._id} special={item.id}>
              <SpecialElement indent label={item.label} icon={item.icon} selected forciblyСollapsed />
            </NavLink>
          {/if}
        {/if}
      </svelte:fragment>
    </TreeNode>
  {/if}
{/if}
