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
  import core from '@anticrm/core'
  import type { Space } from '@anticrm/core'
  import type { NavigatorModel, SpecialNavModel } from '@anticrm/workbench'
  import { getCurrentLocation, navigate } from '@anticrm/ui'
  import { createQuery } from '@anticrm/presentation'
  import view from '@anticrm/view'

  import workbench from '../plugin'

  import SpacesNav from './navigator/SpacesNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'

  export let model: NavigatorModel | undefined
  
  const query = createQuery()
  let archivedSpaces: Space[] = []
  $: if (model) {
    query.query(
      core.class.Space,
      {
        _class: { $in: model.spaces.map(x => x.spaceClass) },
        archived: true
      },
      (result) => { archivedSpaces = result })
  }

  function selectSpecial (id: string): void {
    const loc = getCurrentLocation()
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }
  function getSpecials (specials: SpecialNavModel[], state: 'top' | 'bottom'): SpecialNavModel[] {
    return specials.filter(p => (p.position ?? 'top') === state)
  }
</script>

{#if model}
  {#if model.specials}
    {#each getSpecials(model.specials, 'top') as special}
      <SpecialElement label={special.label} icon={special.icon} on:click={() => selectSpecial(special.id)} />
    {/each}
  {/if}
  {#if archivedSpaces.length > 0}
    <SpecialElement label={workbench.string.Archive} icon={view.icon.Archive} on:click={() => selectSpecial('archive')} />
  {/if}
  {#if model.spaces.length}
    <div class="separator">
      <TreeSeparator />
    </div>
  {/if}
  {#each model.spaces as m (m.label)}
    <SpacesNav model={m}/>
  {/each}
  {#if model.specials}
    {#each getSpecials(model.specials, 'bottom') as special}
      <SpecialElement label={special.label} icon={special.icon} on:click={() => selectSpecial(special.id)} />
    {/each}
  {/if}
{/if}

<style lang="scss">
  .separator {
    &:nth-child(2) {
      display: none;
    }
  }
</style>
