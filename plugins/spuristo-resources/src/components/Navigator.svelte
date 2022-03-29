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
  import { Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Team } from '@anticrm/spuristo'
  import { Scroller } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
import { identity } from 'svelte/internal'
  import spuristo from '../plugin'
  import { NavigationItem, Selection } from '../utils'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'

  export let specials: NavigationItem[] | undefined
  export let selection: Selection
  
  const query = createQuery()
  let spaces: Team[] = []
  
  $: query.query(
    spuristo.class.Team,
    {
    },
    (result) => { spaces = result },
    { sort: { name: SortingOrder.Ascending } })

  $: topSpecials = specials?.filter(it => it.top) ?? []
  $: teamItems = specials?.filter(it => !it.top) ?? []
  
  const dispatch = createEventDispatcher()
  
  function selectSpace (special: string): void {
    dispatch('selection', { currentSpecial: special } as Selection)
  }
</script>

  <Scroller>
    {#each topSpecials as special}
      <SpecialElement label={special.label} icon={special.icon} on:click={() => selectSpace(special.id)} selected={special.id === selection.currentSpecial} />
    {/each}

    <TreeSeparator />

    <SpacesNav {spaces} {teamItems} {selection} on:selection/>
    <div class="antiNav-space" />
  </Scroller>
