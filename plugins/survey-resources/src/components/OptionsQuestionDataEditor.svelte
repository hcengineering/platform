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

<script type="module" lang="ts">
  import { Button, EditBox, RadioButton, IconDelete, IconAdd, CheckBox } from '@hcengineering/ui'
  import { type Checkboxes, type RadioButtons } from '@hcengineering/survey'
  import survey from '../plugin'

  export let object: Checkboxes | RadioButtons
  export let editable = true

  const inputs: EditBox[] = []

  let draft: string = ''

  function appendOption (): void {
    object = {
      ...object,
      options: [...object.options, { label: draft }]
    }
    setTimeout(() => {
      inputs[object.options.length - 1].focus()
      draft = ''
    })
  }

  function removeOptionAt (index: number): void {
    if (index < 1) {
      return
    }
    object = {
      ...object,
      options: [...object.options.slice(0, index), ...object.options.slice(index + 1)]
    }
  }
</script>

<div>
  <div class="mb-4 clear-mins">
    <EditBox bind:value={object.text} kind="large-style" autoFocus fullSize disabled={!editable} />
  </div>

  {#each object.options as _, index}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1 mx-4">
      {#if object._class === survey.class.Checkboxes}
        <CheckBox readonly />
      {:else if object._class === survey.class.RadioButtons}
        <RadioButton group={null} value={index} label="" disabled isMarkerVisible />
      {/if}
      <EditBox
        kind="default"
        fullSize
        bind:value={object.options[index].label}
        bind:this={inputs[index]}
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
      {#if object._class === survey.class.Checkboxes}
        <CheckBox readonly />
      {:else if object._class === survey.class.RadioButtons}
        <RadioButton group={null} value={null} label="" disabled />
      {/if}
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

<style lang="scss">
</style>
