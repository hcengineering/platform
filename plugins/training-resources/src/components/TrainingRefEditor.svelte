<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import type { Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, Button, type ButtonKind, type ButtonSize, Label, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { openDoc } from '@hcengineering/view-resources'
  import training, { type Training } from '@hcengineering/training'
  import type { ComponentProps } from 'svelte'
  import TrainingPresenter from './TrainingPresenter.svelte'
  import TrainingRefEditorPopup from './TrainingRefEditorPopup.svelte'

  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined
  export let kind: ButtonKind = 'regular'
  export let value: Ref<Training> | null | undefined
  export let onChange: (value: Ref<Training> | null | undefined) => void = () => {}
  export let readonly: boolean = false

  let trainingObject: Training | null = null
  const query = createQuery()
  $: query.query(
    training.class.Training,
    {
      _id: value ?? ('missing' as Ref<Training>)
    },
    (result) => {
      trainingObject = result[0] ?? null
    }
  )

  async function onClick (event: MouseEvent): Promise<void> {
    if (readonly) {
      return
    }
    const props: ComponentProps<TrainingRefEditorPopup> = {
      selected: value ?? undefined,
      readonly,
      allowDeselect: false,
      width: 'full',
      shadows: false
    }
    showPopup(TrainingRefEditorPopup, props, event.target as HTMLElement, (result: Training | undefined) => {
      if (result !== undefined) {
        onChange(result._id)
      }
    })
  }
</script>

<Button
  on:click={(event) => {
    void onClick(event)
  }}
  disabled={readonly}
  {width}
  {size}
  {kind}
>
  <svelte:fragment slot="content">
    {#if trainingObject === null}
      <Label label={training.string.NotSelected} />
    {:else}
      <div class="flex-row-center flex-gap-4 text-normal">
        <TrainingPresenter value={trainingObject} disabled showState />

        <ActionIcon
          icon={view.icon.Open}
          size={'small'}
          action={() => {
            if (trainingObject !== null) {
              openDoc(getClient().getHierarchy(), trainingObject)
            }
          }}
        />
      </div>
    {/if}
  </svelte:fragment>
</Button>
