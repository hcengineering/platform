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
  import { Ref, Space } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { ExecutionContext, Process, SelectedUserRequest, Transition } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import TransitionPresenter from '../settings/TransitionPresenter.svelte'
  import RequestUserInputAttribute from './RequestUserInputAttribute.svelte'
  import ClassUserInput from './ClassUserInput.svelte'

  export let processId: Ref<Process>
  export let space: Ref<Space>
  export let transition: Ref<Transition>
  export let inputs: SelectedUserRequest[]
  export let values: ExecutionContext

  const dispatch = createEventDispatcher()
  const client = getClient()
  const model = client.getModel()

  function save (): void {
    dispatch('close', { value: values })
  }

  $: canSaveValue = inputs.every((input) => values[input.id] != null)

  export function canClose (): boolean {
    return false
  }

  const transitionVal = model.findObject(transition)
  const processVal = model.findObject(processId)
</script>

<Card
  on:close
  width={'small'}
  label={plugin.string.EnterValue}
  canSave={canSaveValue}
  okAction={save}
  hideClose
  okLabel={presentation.string.Save}
>
  {#if processVal !== undefined}
    <div>
      <Label label={plugin.string.Process} />:
      {processVal.name}
    </div>
  {/if}
  {#if transitionVal}
    <TransitionPresenter transition={transitionVal} />
  {/if}
  <div class="grid">
    {#each inputs as input}
      {#if input.key === '_class'}
        <ClassUserInput
          _class={input._class}
          value={values[input.id]}
          on:change={(e) => {
            values[input.id] = e.detail
            values = values
          }}
        />
      {:else}
        <RequestUserInputAttribute
          key={input.key}
          _class={input._class}
          {space}
          value={values[input.id]}
          on:change={(e) => {
            values[input.id] = e.detail
            values = values
          }}
        />
      {/if}
    {/each}
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
