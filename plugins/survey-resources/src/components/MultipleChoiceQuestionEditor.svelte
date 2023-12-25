<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Button, EditBox, IconDelete, IconAdd, CheckBox } from '@hcengineering/ui'
  import {
    AssessmentDataOf,
    type MultipleChoiceQuestion,
    type QuestionTypeEditorComponentProps
  } from '@hcengineering/survey'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = MultipleChoiceQuestion

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements {@link QuestionTypeEditorComponentType}
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  interface $$Props extends QuestionTypeEditorComponentProps<Q> {}

  export let object: Q
  export let editable = true
  export let submit: (data: Partial<Q>) => Promise<void>

  const inputs: EditBox[] = []

  let draft: string = ''

  function appendOption (): void {
    update({
      options: [...object.options, { label: draft }]
    })
    setTimeout(() => {
      inputs[object.options.length - 1].focus()
      draft = ''
    })
  }

  function removeOptionAt (index: number): void {
    if (object.options.length < 1) {
      return
    }
    const nextOptions = [...object.options.slice(0, index), ...object.options.slice(index + 1)]
    const prevAssessment: AssessmentDataOf<MultipleChoiceQuestion> | null = object.assessment
    let nextAssessment = prevAssessment
    if (prevAssessment !== null) {
      const selections = prevAssessment.correctAnswer.selections
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))

      nextAssessment = {
        ...prevAssessment,
        correctAnswer: {
          ...prevAssessment.correctAnswer,
          selections
        }
      }
    }
    update({
      options: nextOptions,
      assessment: nextAssessment
    })
  }

  function update (data: Partial<Q> = {}): void {
    object = { ...object, ...data }
    void submit(object)
  }

  function toggleIndex (index: number, on: boolean): boolean | undefined {
    if (object.assessment === null) {
      return undefined
    }
    const selections = new Set(object.assessment.correctAnswer.selections)
    if (on) {
      selections.add(index)
    } else {
      selections.delete(index)
    }
    update({
      assessment: {
        ...object.assessment,
        correctAnswer: {
          ...object.assessment.correctAnswer,
          selections: Array.from(selections)
        }
      }
    })
  }
</script>

<div>
  {#each object.options as _, index (index)}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        <CheckBox
          readonly={!editable || object.assessment === null}
          size="medium"
          checked={object.assessment !== null && object.assessment.correctAnswer.selections.includes(index)}
          on:value={(e) => {
            toggleIndex(index, e.detail)
          }}
        />
      </div>
      <EditBox
        kind="default"
        fullSize
        bind:value={object.options[index].label}
        bind:this={inputs[index]}
        on:change={() => {
          update()
        }}
        disabled={!editable}
      />
      {#if editable && object.options.length > 1}
        <Button
          icon={IconDelete}
          kind="ghost"
          shape="circle"
          size="medium"
          on:click={() => {
            removeOptionAt(index)
          }}
        />
      {/if}
    </div>
  {/each}

  {#if editable}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        <CheckBox readonly size="medium" />
      </div>
      <EditBox
        kind="default"
        fullSize
        bind:value={draft}
        on:input={() => {
          appendOption()
        }}
      />
      <Button
        icon={IconAdd}
        kind="ghost"
        shape="circle"
        size="medium"
        on:click={() => {
          appendOption()
        }}
      />
    </div>
  {/if}
</div>
