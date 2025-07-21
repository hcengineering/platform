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
  import { Process, Transition } from '@hcengineering/process'
  import { Button, getCurrentLocation, IconAdd, Label, navigate, showPopup } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import AddTransitionPopup from './AddTransitionPopup.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'
  import TriggerPresenter from './TriggerPresenter.svelte'

  export let process: Process
  export let transitions: Transition[]
  export let readonly: boolean

  function addTransition (): void {
    showPopup(AddTransitionPopup, { process }, 'top')
  }

  function handleSelect (id: Ref<Transition>): void {
    const loc = getCurrentLocation()
    loc.path[5] = plugin.component.TransitionEditor
    loc.path[6] = id
    navigate(loc, true)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hulyTableAttr-container box">
  <div class="header w-full p-4">
    <Label label={plugin.string.Transitions} />
  </div>
  {#each transitions as transition (transition._id)}
    <Button
      width={'100%'}
      kind={'ghost'}
      justify={'left'}
      on:click={() => {
        handleSelect(transition._id)
      }}
    >
      <svelte:fragment slot="content">
        <div class="flex-row-center flex-gap-4">
          <TransitionPresenter {transition} />
          <TriggerPresenter value={transition.trigger} {process} params={transition.triggerParams} withLabel={true} />
        </div>
      </svelte:fragment>
    </Button>
  {/each}
  {#if !readonly}
    <Button kind={'ghost'} width={'100%'} icon={IconAdd} label={plugin.string.AddTransition} on:click={addTransition} />
  {/if}
</div>

<style lang="scss">
  .box {
    width: 32rem;
    align-self: center;
  }

  .header {
    font-weight: 500;
    font-size: 1rem;
    color: var(--theme-caption-color);
    user-select: none;
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
