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
  import { Label, showPopup } from '@anticrm/ui'
  import DoneStatePresenter from './DoneStatePresenter.svelte'
  import DoneStatesPopup from './DoneStatesPopup.svelte'
  import task from '../../plugin'

  export let value: Ref<DoneState> | null | undefined
  export let onChange: (value: any) => void
  export let space: Ref<SpaceWithStates>
  let state: DoneState | undefined
  let container: HTMLElement
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
  }
</script>

<div
  class="flex-row-center cursor-pointer"
  bind:this={container}
  on:click|preventDefault={() => {
    if (!opened) {
      opened = true
      showPopup(DoneStatesPopup, { space }, container, (result) => {
        if (result) {
          value = result._id
          onChange(value)
        } else if (result === null) {
          value = null
          onChange(value)
        }

        opened = false
      })
    }
  }}
>
  {#if state}
    <DoneStatePresenter value={state} showTitle />
  {:else}
    <div class="color"/>
    <Label label={task.string.NoDoneState} />
  {/if}
</div>
<style lang="scss">
  .color {
    border: 0.5px #ffffff55 solid;
    margin-right: 0.75rem;
    width: .5rem;
    height: .5rem;
    border-radius: .5rem;
  }
</style>