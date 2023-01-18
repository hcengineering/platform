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
  import core, { Doc, Ref, SortingOrder, Space, getCurrentAccount } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconEdit, navigate, Scroller, showPopup } from '@hcengineering/ui'
  import type { Application, NavigatorModel, SpecialNavModel } from '@hcengineering/workbench'
  import setting from '@hcengineering/setting'
  import { createEventDispatcher } from 'svelte'
  import preferece, { SpacePreference } from '@hcengineering/preference'
  import { getSpecialSpaceClass } from '../utils'
  import preference from '@hcengineering/preference'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import StarredNav from './navigator/StarredNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'
  import HelpAndSupport from './HelpAndSupport.svelte'
  import workbench from '../plugin'
  import TreeNode from './navigator/TreeNode.svelte'
  import TreeItem from './navigator/TreeItem.svelte'
  import view from '../../../view'
  import { filterStore } from '@hcengineering/view-resources'
  import { FilteredView } from '@hcengineering/view'

  export let model: NavigatorModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentApplication: Application | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()
  const myAccId = getCurrentAccount()._id

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

  preferenceQuery.query(preferece.class.SpacePreference, {}, (res) => {
    preferences = new Map(
      res.map((r) => {
        return [r.attachedTo, r]
      })
    )
  })

  let requestIndex = 0
  async function update (model: NavigatorModel, spaces: Space[], preferences: Map<Ref<Doc>, SpacePreference>) {
    shownSpaces = spaces.filter(
      (sp) => !sp.archived && !preferences.has(sp._id) && (!sp.private || sp.members.includes(myAccId))
    )
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

  function removeAction (filteredView: FilteredView) {
    return [
      {
        icon: view.icon.Archive ?? IconEdit,
        label: setting.string.Delete,
        action: async (ctx: any, evt: Event) => {
          await client.removeDoc(view.class.FilteredView, currentSpace, filteredView._id)
        }
      }
    ]
  }

  async function updateSpecials (
    specials: SpecialNavModel[],
    spaces: Space[],
    requestIndex: number
  ): Promise<[Map<string, SpecialNavModel[]>, number]> {
    const result = new Map<string, SpecialNavModel[]>()
    const promises = specials.map(async (sp) => {
      const pos = sp.position ?? 'top'
      let visible = true
      if (sp.visibleIf !== undefined) {
        const f = await getResource(sp.visibleIf)
        visible = f(spaces)
      }
      if (visible) {
        const list = result.get(pos) ?? []
        list.push(sp)
        result.set(pos, list)
      }
    })
    await Promise.all(promises)
    return [result, requestIndex]
  }
  const dispatch = createEventDispatcher()
  const filteredViewsQuery = createQuery()
  let filteredViews
  $: filteredViewsQuery.query(view.class.FilteredView, { attachedTo: currentApplication?.alias }, (result) => {
    filteredViews = result
  })
</script>

{#if model}
  <Scroller>
    {#if model.specials}
      {#each specials as special, row}
        {#if row > 0 && specials[row].position !== specials[row - 1].position}
          <TreeSeparator />
        {/if}
        <SpecialElement
          label={special.label}
          icon={special.icon}
          on:click={() => dispatch('special', special.id)}
          selected={special.id === currentSpecial}
          indent={'ml-2'}
        />
      {/each}
    {/if}

    {#if specials.length > 0}<TreeSeparator />{/if}
    {#if filteredViews && filteredViews.length > 0}
      <TreeNode label={view.string.FilteredViews}>
        {#each filteredViews as fV}
          <TreeItem
            title={fV.name}
            on:click={() => {
              $filterStore = JSON.parse(fV.filters)
              navigate(fV.location)
            }}
            actions={() => removeAction(fV)}
          />
        {/each}
      </TreeNode>
    {/if}
    {#if starred.length}
      <StarredNav label={preference.string.Starred} spaces={starred} on:space {currentSpace} />
    {/if}

    {#each model.spaces as m (m.label)}
      <SpacesNav
        spaces={shownSpaces.filter((it) => hierarchy.isDerived(it._class, m.spaceClass))}
        {currentSpace}
        hasSpaceBrowser={model.specials?.find((p) => p.id === 'spaceBrowser') !== undefined}
        model={m}
        on:space
        on:open
        {currentSpecial}
      />
    {/each}
    <div class="antiNav-space" />

    <div class="antiNav-footer">
      <Button
        id="contact-us"
        icon={setting.icon.Support}
        kind={'transparent'}
        size={'small'}
        label={workbench.string.HelpAndSupport}
        on:click={() => showPopup(HelpAndSupport, {}, 'help-center')}
      />
    </div>
  </Scroller>
{/if}
