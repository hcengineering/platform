<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import core, { Doc, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import preference, { SpacePreference } from '@hcengineering/preference'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import type { Application, NavigatorModel, SpecialNavModel } from '@hcengineering/workbench'
  import { getSpecialSpaceClass } from '../utils'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import StarredNav from './navigator/StarredNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'
  import SavedView from './SavedView.svelte'

  export let model: NavigatorModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let currentApplication: Application | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let spaces: Space[] = []
  let starred: Space[] = []
  let shownSpaces: Space[] = []

  $: if (model) {
    query.query(
      core.class.Space,
      {
        _class: { $in: getSpecialSpaceClass(model) }
        // temp disabled, need way for default spaces
        // members: getCurrentAccount()._id
      },
      (result) => {
        spaces = result
      },
      { sort: { name: SortingOrder.Ascending } }
    )
  }

  let specials: SpecialNavModel[] = []

  let preferences: Map<Ref<Doc>, SpacePreference> = new Map<Ref<Doc>, SpacePreference>()

  const preferenceQuery = createQuery()

  preferenceQuery.query(preference.class.SpacePreference, {}, (res) => {
    preferences = new Map(
      res.map((r) => {
        return [r.attachedTo, r]
      })
    )
  })

  let requestIndex = 0
  async function update (model: NavigatorModel, spaces: Space[], preferences: Map<Ref<Doc>, SpacePreference>) {
    shownSpaces = spaces.filter((sp) => !sp.archived && !preferences.has(sp._id))
    starred = spaces.filter((sp) => preferences.has(sp._id))
    if (model.specials !== undefined) {
      const [sp, resIndex] = await updateSpecials(model.specials, spaces, ++requestIndex)
      if (resIndex !== requestIndex) return
      const topSpecials = sp.get('top') ?? []
      const bottomSpecials = sp.get('bottom') ?? []
      sp.delete('top')
      sp.delete('bottom')

      const result = [...topSpecials]

      for (const k of Array.from(sp.keys()).sort()) {
        result.push(...(sp.get(k) ?? []))
      }

      result.push(...bottomSpecials)
      specials = result
    } else {
      specials = []
    }
  }

  $: if (model) update(model, spaces, preferences)

  async function updateSpecials (
    specials: SpecialNavModel[],
    spaces: Space[],
    requestIndex: number
  ): Promise<[Map<string, SpecialNavModel[]>, number]> {
    const result = new Map<string, SpecialNavModel[]>()

    const spHandlers = await Promise.all(
      specials.map(async (sp) => {
        const pos = sp.position ?? 'top'
        let visible = true
        if (sp.visibleIf !== undefined) {
          const f = await getResource(sp.visibleIf)
          visible = await f(spaces)
        }

        return () => {
          if (visible) {
            const list = result.get(pos) ?? []
            list.push(sp)
            result.set(pos, list)
          }
        }
      })
    )
    spHandlers.forEach((spHandler) => spHandler())

    return [result, requestIndex]
  }

  async function checkIsDisabled (special: SpecialNavModel) {
    return special.checkIsDisabled && (await (await getResource(special.checkIsDisabled))())
  }

  let savedMenu: boolean = false
  let menuSelection: boolean = false
</script>

{#if model}
  <Scroller shrink>
    {#if model.specials}
      {#each specials as special, row}
        {#if row > 0 && specials[row].position !== specials[row - 1].position}
          <TreeSeparator line />
        {/if}
        {#await checkIsDisabled(special) then disabled}
          <NavLink space={special.id} {disabled}>
            <SpecialElement
              label={special.label}
              icon={special.icon}
              selected={menuSelection ? false : special.id === currentSpecial}
              {disabled}
              indent={special.nestingLevel === 1 ? 'ml-2' : (special.nestingLevel === 2 && 'ml-4') || undefined}
            />
          </NavLink>
        {/await}
      {/each}
    {/if}

    {#if specials.length > 0 && (starred.length > 0 || savedMenu)}<TreeSeparator line />{/if}
    <SavedView
      {currentApplication}
      on:shown={(res) => (savedMenu = res.detail)}
      on:select={(res) => (menuSelection = res.detail)}
    />
    {#if starred.length}
      <StarredNav
        label={preference.string.Starred}
        spaces={starred}
        models={model.spaces}
        on:space
        {currentSpace}
        {currentSpecial}
        {currentFragment}
        deselect={menuSelection}
      />
    {/if}

    {#each model.spaces as m, i (m.label)}
      {#if (i === 0 && (specials.length > 0 || starred.length || savedMenu)) || i !== 0}<TreeSeparator line />{/if}
      <SpacesNav
        spaces={shownSpaces.filter((it) => hierarchy.isDerived(it._class, m.spaceClass))}
        {currentSpace}
        hasSpaceBrowser={model.specials?.find((p) => p.id === 'spaceBrowser') !== undefined}
        model={m}
        on:open
        {currentSpecial}
        {currentFragment}
        deselect={menuSelection}
        separate
      />
    {/each}
    <div class="antiNav-space" />
  </Scroller>
{/if}
