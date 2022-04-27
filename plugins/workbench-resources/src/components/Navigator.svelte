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
  import core, { Doc, Ref, SortingOrder, Space, getCurrentAccount } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Scroller } from '@anticrm/ui'
  import type { NavigatorModel, SpecialNavModel } from '@anticrm/workbench'
  import { createEventDispatcher } from 'svelte'
  import preferece, { SpacePreference } from '@anticrm/preference'
  import { getSpecialSpaceClass } from '../utils'
  import preference from '@anticrm/preference'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import StarredNav from './navigator/StarredNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'

  export let model: NavigatorModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined

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

  let topSpecials: SpecialNavModel[] = []
  let bottomSpecials: SpecialNavModel[] = []

  let preferences: Map<Ref<Doc>, SpacePreference> = new Map<Ref<Doc>, SpacePreference>()

  const preferenceQuery = createQuery()

  preferenceQuery.query(preferece.class.SpacePreference, {}, (res) => {
    preferences = new Map(
      res.map((r) => {
        return [r.attachedTo, r]
      })
    )
  })

  async function update(model: NavigatorModel, spaces: Space[], preferences: Map<Ref<Doc>, SpacePreference>) {
    if (model.specials !== undefined) {
      topSpecials = await getSpecials(model.specials, 'top', spaces)
      bottomSpecials = await getSpecials(model.specials, 'bottom', spaces)
    } else {
      topSpecials = []
      bottomSpecials = []
    }
    shownSpaces = spaces.filter((sp) => !sp.archived && !preferences.has(sp._id) && (!sp.members.length || sp.members.includes(myAccId)))
    starred = spaces.filter((sp) => preferences.has(sp._id))
  }

  $: if (model) update(model, spaces, preferences)

  async function getSpecials(
    specials: SpecialNavModel[],
    state: 'top' | 'bottom',
    spaces: Space[]
  ): Promise<SpecialNavModel[]> {
    const result: SpecialNavModel[] = []
    for (const sp of specials) {
      if ((sp.position ?? 'top') === state) {
        if (sp.visibleIf !== undefined) {
          const f = await getResource(sp.visibleIf)
          if (f(spaces)) {
            result.push(sp)
          }
        } else {
          result.push(sp)
        }
      }
    }
    return result
  }
  const dispatch = createEventDispatcher()
</script>

{#if model}
  <Scroller>
    {#if model.specials}
      {#each topSpecials as special}
        <SpecialElement
          label={special.label}
          icon={special.icon}
          on:click={() => dispatch('special', special.id)}
          selected={special.id === currentSpecial}
          indent={'ml-2'}
        />
      {/each}
      {#if topSpecials.length > 0 && bottomSpecials.length > 0}
        <TreeSeparator />
      {/if}
      {#each bottomSpecials as special}
        <SpecialElement
          label={special.label}
          icon={special.icon}
          on:click={() => dispatch('special', special.id)}
          selected={special.id === currentSpecial}
          indent={'ml-2'}
        />
      {/each}
    {/if}

    {#if topSpecials.length > 0 || bottomSpecials.length > 0}<TreeSeparator />{/if}

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
  </Scroller>
{/if}
