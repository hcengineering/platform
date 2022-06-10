<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { DoneState, SpaceWithStates } from '@anticrm/task'
  import { Label, showPopup, Button } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import DoneStatePresenter from './DoneStatePresenter.svelte'
  import DoneStatesPopup from './DoneStatesPopup.svelte'
  import task from '../../plugin'

  export let value: Ref<DoneState> | null | undefined
  export let onChange: (value: any) => void
  export let space: Ref<SpaceWithStates>
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string = 'min-content'

  let state: DoneState | undefined
  let container: HTMLButtonElement
  let opened: boolean = false

  const query = createQuery()
  $: if (value != null) {
    query.query(
      task.class.DoneState,
      { _id: value },
      (res) => {
        state = res[0]
      },
      { limit: 1 }
    )
  } else {
    query.unsubscribe()
  }
</script>

<Button
  {kind}
  {size}
  {justify}
  {width}
  bind:input={container}
  on:click={() => {
    if (!opened) {
      opened = true
      showPopup(DoneStatesPopup, { space }, container, (result) => {
        if (result && result._id !== value) {
          value = result._id
          onChange(value)
        } else if (result === null && value !== null) {
          value = null
          onChange(value)
        }

        opened = false
      })
    }
  }}
>
  <svelte:fragment slot="content">
    {#if state}
      <div class="pointer-events-none"><DoneStatePresenter value={state} showTitle /></div>
    {:else}
      <div class="flex-row-center pointer-events-none">
        <div class="color background-card-divider" />
        <span class="overflow-label"><Label label={task.string.NoDoneState} /></span>
      </div>
    {/if}
  </svelte:fragment>
</Button>

<style lang="scss">
  .color {
    margin-right: 0.75rem;
    min-width: 0.5rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 0.5rem;
  }
</style>
