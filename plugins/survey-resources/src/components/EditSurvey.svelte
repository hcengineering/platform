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
  import { getClient } from '@hcengineering/presentation'
  import { Survey } from '@hcengineering/survey'
  import { EditBox, FocusHandler, Label, createFocusManager, Icon } from '@hcengineering/ui'
  import EditQuestion from './EditQuestion.svelte'
  import survey from '../plugin'
  import IconQuestion from './icons/Question.svelte'

  const manager = createFocusManager()
  const client = getClient()

  export let object: Survey
  export let readonly: boolean = false

  $: questions = object?.questions ?? []

  async function nameChange (): Promise<void> {
    await client.updateDoc(object._class, object.space, object._id, { name: object.name })
  }

  async function promptChange (): Promise<void> {
    await client.updateDoc(object._class, object.space, object._id, { prompt: object.prompt })
  }

  let draggedIndex: number | undefined = undefined
  let draggedOverIndex: number | undefined = undefined

  function dragOver (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined || draggedIndex === draggedOverIndex || draggedIndex + 1 === draggedOverIndex) {
      return
    }
    ev.preventDefault()
    draggedOverIndex = index
  }

  function dragLeave (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined) {
      return
    }
    ev.preventDefault()
    if (draggedOverIndex === index) {
      draggedOverIndex = undefined
    }
  }

  async function dragDrop (): Promise<void> {
    if (draggedIndex === undefined || draggedOverIndex === undefined) {
      return
    }
    let modified = false
    if (draggedOverIndex === questions.length && draggedIndex !== questions.length - 1) {
      questions.push(questions[draggedIndex])
      questions.splice(draggedIndex, 1)
      modified = true
    } else if (draggedOverIndex < draggedIndex) {
      const tmp = questions[draggedIndex]
      questions[draggedIndex] = questions[draggedOverIndex]
      questions[draggedOverIndex] = tmp
      modified = true
    } else if (draggedIndex + 1 !== draggedOverIndex) {
      const tmp = questions[draggedIndex]
      questions[draggedIndex] = questions[draggedOverIndex - 1]
      questions[draggedOverIndex - 1] = tmp
      modified = true
    }
    if (modified) {
      await client.updateDoc(object._class, object.space, object._id, { questions })
    }
  }
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-center flex-no-shrink step-tb-6">
    <EditBox
      disabled={readonly}
      placeholder={survey.string.Name}
      bind:value={object.name}
      kind={'large-style'}
      on:change={nameChange}
    />
  </div>
  <div class="step-tb-6">
    <EditBox
      disabled={readonly}
      placeholder={survey.string.PromptPlaceholder}
      bind:value={object.prompt}
      on:change={promptChange}
    />
  </div>
  <div class="antiSection step-tb-6">
    <div class="antiSection-header mb-3">
      <div class="antiSection-header__icon">
        <Icon icon={IconQuestion} size={'small'} />
      </div>
      <span class="antiSection-header__title">
        <Label label={survey.string.Questions} />
      </span>
    </div>
    {#each questions as question, index}
      <div
        role="listitem"
        on:dragover={(ev) => {
          dragOver(ev, index)
        }}
        on:dragleave={(ev) => {
          dragLeave(ev, index)
        }}
        on:drop={dragDrop}
        class:dragged-over={draggedIndex !== undefined &&
          draggedOverIndex === index &&
          draggedOverIndex !== draggedIndex &&
          draggedOverIndex !== draggedIndex + 1}
      >
        <EditQuestion
          {index}
          {readonly}
          parent={object}
          on:dragStart={() => {
            draggedIndex = index
          }}
          on:dragEnd={() => {
            draggedIndex = undefined
            draggedOverIndex = undefined
          }}
        />
      </div>
    {/each}
    {#if !readonly}
      <div
        role="listitem"
        on:dragover={(ev) => {
          dragOver(ev, questions.length)
        }}
        on:dragleave={(ev) => {
          dragLeave(ev, questions.length)
        }}
        on:drop={dragDrop}
        class:dragged-over={draggedOverIndex === questions.length && draggedIndex !== questions.length - 1}
      >
        <EditQuestion parent={object} index={-1} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  div[role='listitem'] + div[role='listitem'] {
    margin-top: var(--spacing-1);
  }
  .dragged-over {
    transition: box-shadow 0.1s ease-in;
    box-shadow: 0 -3px 0 0 var(--primary-button-outline);
  }
</style>
