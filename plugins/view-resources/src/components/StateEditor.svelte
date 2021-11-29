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
  import core, { Ref, State } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { showPopup } from '@anticrm/ui'
  import StatePresenter from './StatePresenter.svelte'
  import StatesPopup from './StatesPopup.svelte'

  export let value: Ref<State>
  export let onChange: (value: any) => void
  let state: State
  let container: HTMLElement
  let opened: boolean = false

  const query = createQuery()
  $: query.query(core.class.State, { _id: value }, (res) => { 
    state = res[0]
  }, { limit: 1 })
</script>

{#if state}
  <div class="flex-row-center" bind:this={container}
    on:click|preventDefault={() => {
      if (!opened) {
        opened = true
        showPopup(StatesPopup, { space: state.space }, container, (result) => {
          if (result) { 
            value = result._id
            onChange(value)
           }
          opened = false
        })
      }
    }} >
    <StatePresenter value={state} />
  </div>
{/if}
