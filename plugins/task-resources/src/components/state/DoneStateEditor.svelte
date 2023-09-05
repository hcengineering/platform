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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { DoneState, SpaceWithStates } from '@hcengineering/task'
  import { Label, showPopup, Button } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import DoneStatePresenter from './DoneStatePresenter.svelte'
  import DoneStatesPopup from './DoneStatesPopup.svelte'
  import task from '../../plugin'
  import Unknown from '../icons/Unknown.svelte'

  export let value: Ref<DoneState> | null | undefined
  export let onChange: (value: any) => void
  export let space: Ref<SpaceWithStates> | undefined
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
    state = undefined
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
        <div class="content-dark-color mr-2"><Unknown size={'small'} /></div>
        <span class="overflow-label"><Label label={task.string.NoDoneState} /></span>
      </div>
    {/if}
  </svelte:fragment>
</Button>
