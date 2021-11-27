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
  import type { NavigatorModel, SpecialNavModel } from '@anticrm/workbench'
  import SpacesNav from './navigator/SpacesNav.svelte'
  import TreeSeparator from './navigator/TreeSeparator.svelte'
  import SpecialElement from './navigator/SpecialElement.svelte'
  import { getCurrentLocation, navigate } from '@anticrm/ui'

  export let model: NavigatorModel | undefined

  function selectSpecial (sp: SpecialNavModel): void {
    const loc = getCurrentLocation()
    loc.path[2] = sp.id
    loc.path.length = 3
    navigate(loc)
  }
</script>

{#if model}
  {#if model.specials}
    {#each model.specials as special}
      <SpecialElement label={special.label} icon={special.icon} on:click={() => selectSpecial(special)} />
    {/each}
    {#if model.spaces.length}
      <TreeSeparator />
    {/if}
  {/if}
  {#each model.spaces as m}
    <SpacesNav model={m} />
  {/each}
{/if}
