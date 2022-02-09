<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import core, { Ref, SortingOrder, Space } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { Scroller } from '@anticrm/ui'
  import type { NavigatorModel, SpecialNavModel } from '@anticrm/workbench'
  import { createEventDispatcher } from 'svelte'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'

  export let model: NavigatorModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  
  const query = createQuery()
  let spaces: Space[] = []
  let shownSpaces: Space[] = []
  $: if (model) {
    query.query(
      core.class.Space,
      {
        _class: { $in: model.spaces.map(x => x.spaceClass) }
      },
      (result) => { spaces = result },
      { sort: { name: SortingOrder.Ascending } })
  }

  let showDivider: Boolean = false
  let specTopCount: number
  let specBottomCount: number
  let spModelCount: number

  let topSpecials: SpecialNavModel[] = []
  let bottomSpecials: SpecialNavModel[] = []

  async function update (model: NavigatorModel, spaces: Space[]) {
    if (model.specials !== undefined) {
      topSpecials = await getSpecials(model.specials, 'top', spaces)
      specTopCount = topSpecials.length
      bottomSpecials = await getSpecials(model.specials, 'bottom', spaces)
      specBottomCount = bottomSpecials.length
    } else {
      topSpecials = []
      bottomSpecials = []
      specBottomCount = 0
      specTopCount = 0
    }
    if (model.spaces) spModelCount = model.spaces.length
    shownSpaces = spaces.filter(sp => !sp.archived)
    showDivider = !!((specTopCount > 0 && specBottomCount + spModelCount > 0))
  }

  $: if (model) update(model, spaces)
  
  async function getSpecials (specials: SpecialNavModel[], state: 'top' | 'bottom', spaces: Space[]): Promise<SpecialNavModel[]> {
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
        <SpecialElement label={special.label} icon={special.icon} on:click={() => dispatch('special', special.id)} selected={special.id === currentSpecial} />
      {/each}
    {/if}

    {#if showDivider}<TreeSeparator />{/if}

    {#each model.spaces as m (m.label)}
      <SpacesNav spaces={shownSpaces} {currentSpace} model={m} on:space/>
    {/each}
    {#if model.specials}
      {#each bottomSpecials as special}
        <SpecialElement label={special.label} icon={special.icon} on:click={() => dispatch('special', special.id)} selected={special.id === currentSpecial} />
      {/each}
    {/if}
    <div class="antiNav-space" />
  </Scroller>
{/if}
