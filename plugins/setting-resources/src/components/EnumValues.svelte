<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Enum } from '@hcengineering/core'
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import { ActionIcon, EditBox, IconAdd, IconAttachment, IconDelete, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import setting from '../plugin'
  import EnumValuesList from './EnumValuesList.svelte'
  import Copy from './icons/Copy.svelte'

  export let value: Enum

  const client = getClient()

  let newValue = ''

  async function add () {
    if (newValue.trim().length === 0) return
    if (value.enumValues.includes(newValue.trim())) return
    await client.update(value, {
      $push: { enumValues: newValue }
    })
    newValue = ''
  }

  async function remove (target: string) {
    await client.update(value, {
      $pull: { enumValues: target }
    })
  }
  const handleKeydown = (evt: KeyboardEvent) => {
    if (evt.key === 'Enter') {
      add()
    }
  }
  $: filtered = newValue.length > 0 ? value.enumValues.filter((it) => it.includes(newValue)) : value.enumValues

  async function handleClipboard (): Promise<void> {
    const text = await navigator.clipboard.readText()
    processText(text)
  }

  async function processText (text: string): Promise<void> {
    const newValues = text.split('\n').map((it) => it.trim())
    for (const v of newValues) {
      if (!value.enumValues.includes(v)) {
        await client.update(value, {
          $push: { enumValues: v }
        })
      }
    }
    newValue = ''
  }
  let inputFile: HTMLInputElement
  async function processFile (file: File): Promise<void> {
    const text = await file.text()
    processText(text)
  }

  function fileSelected () {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        processFile(file)
      }
    }
    inputFile.value = ''
  }
  function onDelete () {
    showPopup(
      MessageBox,
      {
        label: view.string.DeleteObject,
        message: view.string.DeleteObjectConfirm,
        params: { count: filtered.length }
      },
      undefined,
      (result?: boolean) => {
        if (result === true) {
          client.update(value, {
            $pull: { enumValues: { $in: filtered } }
          })
          newValue = ''
        }
      }
    )
  }

  async function onDrop () {
    await client.update(value, { enumValues: value.enumValues })
  }
</script>

<input
  bind:this={inputFile}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
/>
<div class="flex-grow">
  <div class="flex-between mb-4">
    <EditBox
      placeholder={presentation.string.Search}
      on:keydown={handleKeydown}
      kind="large-style"
      bind:value={newValue}
    />
    <div class="flex-row-center gap-2">
      <ActionIcon
        icon={IconAdd}
        label={setting.string.Add}
        action={add}
        size={'small'}
        disabled={value.enumValues.includes(newValue.trim())}
      />
      <ActionIcon
        icon={IconAttachment}
        label={setting.string.ImportEnum}
        action={() => {
          inputFile.click()
        }}
        size={'small'}
      />
      <ActionIcon
        icon={Copy}
        label={setting.string.ImportEnumCopy}
        action={() => {
          handleClipboard()
        }}
        size={'small'}
      />
      <ActionIcon
        icon={IconDelete}
        label={setting.string.Delete}
        action={() => {
          onDelete()
        }}
        size={'small'}
      />
    </div>
  </div>
  <div class="scroll">
    <div class="box">
      <EnumValuesList
        bind:values={value.enumValues}
        bind:filtered
        on:remove={(e) => remove(e.detail)}
        on:drop={onDrop}
      />
    </div>
  </div>
</div>
