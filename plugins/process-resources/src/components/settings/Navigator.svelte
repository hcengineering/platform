<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { State, Transition } from '@hcengineering/process'
  import { getCurrentLocation, navigate, ButtonIcon, IconDescription, NavItem, Separator } from '@hcengineering/ui'
  import TransitionPresenter from './TransitionPresenter.svelte'
  import process from '../../plugin'

  export let visibleSecondNav: boolean = true
  export let states: State[] = []
  export let transitions: Transition[] = []

  function handleSelect (id: Ref<State | Transition>): void {
    const loc = getCurrentLocation()
    loc.path[5] = process.component.TransitionEditor
    loc.path[6] = id
    navigate(loc, true)
  }
</script>

{#if visibleSecondNav}
  <div class="hulyComponent-content__column pt-4">
    {#each states as state (state._id)}
      <div class="state">
        {state.title}
      </div>
    {/each}
    <div class="mt-4" />
    {#each transitions as transition (transition._id)}
      <NavItem
        type="type-anchor-link"
        on:click={() => {
          handleSelect(transition._id)
        }}
      >
        <TransitionPresenter {transition} />
      </NavItem>
    {/each}
  </div>
  <Separator name="spaceTypeEditor" index={0} color="transparent" />
{/if}

<style lang="scss">
  .state {
    font-weight: 500;
    color: var(--global-tertiary-TextColor);
    padding: 0 var(--spacing-1_5) 0 var(--spacing-1_25);
    min-height: 1.75rem;
    margin: 0 0.75rem;
  }
</style>
