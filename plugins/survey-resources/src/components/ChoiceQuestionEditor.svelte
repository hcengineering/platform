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
  import { Button, EditBox, RadioButton, IconDelete, IconAdd, CheckBox } from '@hcengineering/ui'
  import {
    type MultipleChoiceQuestion,
    type QuestionEditorComponentProps,
    type SingleChoiceQuestion
  } from '@hcengineering/survey'
  import survey from '../plugin'
  import { getClient } from '@hcengineering/presentation'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = SingleChoiceQuestion | MultipleChoiceQuestion

  /**
   * Declared $$Props help TypeScript ensure that your component is a valid {@link QuestionEditorComponent}
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  interface $$Props extends QuestionEditorComponentProps<Q> {}

  export let object: Q
  export let editable = true
  export let submit: (data: Partial<Q>) => Promise<void>

  const inputs: EditBox[] = []
  const hierarchy = getClient().getHierarchy()

  let draft: string = ''
  let useCheckboxes: boolean
  let useRadioButtons: boolean

  $: useCheckboxes = hierarchy.isDerived(object._class, survey.class.MultipleChoiceQuestion)
  $: useRadioButtons = hierarchy.isDerived(object._class, survey.class.SingleChoiceQuestion)

  function appendOption (): void {
    update({ options: [...object.options, { label: draft }] })
    setTimeout(() => {
      inputs[object.options.length - 1].focus()
      draft = ''
    })
  }

  function removeOptionAt (index: number): void {
    if (object.options.length > 1) {
      update({ options: [...object.options.slice(0, index), ...object.options.slice(index + 1)] })
    }
  }

  function update (data: Partial<Q> = {}): void {
    object = { ...object, ...data }
    void submit(object)
  }
</script>

<form>
  {#each object.options as _, index}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1 mx-4">
      <div class="flex min-w-6">
        {#if useCheckboxes}
          <CheckBox readonly size="medium" />
        {:else if useRadioButtons}
          <RadioButton group={null} value={index} label="" disabled />
        {/if}
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
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1 mx-4">
      <div class="flex min-w-6">
        {#if useCheckboxes}
          <CheckBox readonly />
        {:else if useRadioButtons}
          <RadioButton group={null} value={-1} label="" disabled />
        {/if}
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
</form>

<style lang="scss">
</style>
