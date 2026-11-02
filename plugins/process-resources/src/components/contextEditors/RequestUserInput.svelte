<!--
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { type Markup, type Ref, type Space } from '@hcengineering/core'
  import presentation, { Card, getClient, MessageViewer } from '@hcengineering/presentation'
  import { ExecutionContext, Process, Transition } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { isRequiredValueFilled } from '../../required-value'
  import TransitionPresenter from '../settings/TransitionPresenter.svelte'
  import RequestUserInputAttribute from './RequestUserInputAttribute.svelte'
  import ClassUserInput from './ClassUserInput.svelte'
  import type { ResolvedUserRequest } from '../../selection-space'

  export let processId: Ref<Process>
  export let space: Ref<Space>
  export let transition: Ref<Transition>
  export let inputs: ResolvedUserRequest[]
  export let values: ExecutionContext
  export let title: string | undefined = undefined
  export let description: Markup | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const model = client.getModel()

  function save (): void {
    if (!canSaveValue) return
    dispatch('close', { value: values })
  }

  $: canSaveValue = inputs.every((input) =>
    isRequiredValueFilled(values[input.id], client.getHierarchy().findAttribute(input._class, input.key)?.type)
  )

  const transitionVal = model.findObject(transition)
  const processVal = model.findObject(processId)
</script>

<Card
  on:close
  width={'small'}
  label={plugin.string.EnterValue}
  canSave={canSaveValue}
  okAction={save}
  okLabel={presentation.string.Save}
>
  {#if title !== undefined && title.trim() !== ''}
    <div class="input-title">{title}</div>
  {/if}
  {#if processVal !== undefined}
    <div>
      <Label label={plugin.string.Process} />:
      {processVal.name}
    </div>
  {/if}
  {#if transitionVal}
    <TransitionPresenter transition={transitionVal} />
  {/if}
  {#if description !== undefined && description.trim() !== ''}
    <div class="description">
      <MessageViewer message={description} />
    </div>
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
          selectionSpace={input.selectionSpace}
          docQuery={input.docQuery}
          multiple={input.multiple ?? false}
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

  .description {
    margin: 1rem 0;
  }

  .input-title {
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
</style>
