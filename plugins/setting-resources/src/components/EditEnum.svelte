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
  import core, { Enum } from '@hcengineering/core'
  import presentation, { Card, getClient, MessageBox } from '@hcengineering/presentation'
  import { ActionIcon, EditBox, IconAdd, IconAttachment, IconDelete, ListView, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'
  import EnumValuesList from './EnumValuesList.svelte'
  import Copy from './icons/Copy.svelte'

  export let value: Enum | undefined
  export let name: string = value?.name ?? ''
  export let values: string[] = value?.enumValues ?? []
  const client = getClient()
  const dispatch = createEventDispatcher()

  let list: ListView

  async function save (): Promise<void> {
    if (value === undefined) {
      await client.createDoc(core.class.Enum, core.space.Model, {
        name,
        enumValues: values
      })
    } else {
      await client.update(value, {
        name,
        enumValues: values
      })
    }
    dispatch('close')
  }

  function add () {
    newValue = newValue.trim()
    if (newValue.length === 0) return
    if (values.includes(newValue)) return
    values.push(newValue)
    values = values
    newValue = ''
  }

  function remove (value: string) {
    values = values.filter((p) => p !== value)
  }

  let newValue = ''
  let inputFile: HTMLInputElement

  function processText (text: string): void {
    const newValues = text.split('\n').map((it) => it.trim())
    for (const v of newValues) {
      if (!values.includes(v)) {
        values.push(v)
      }
    }
    values = values
    newValue = ''
  }
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

  function fileDrop (e: DragEvent) {
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        processFile(file)
      }
    }
  }
  function pasteAction (evt: ClipboardEvent): void {
    const items = evt.clipboardData?.items ?? []
    for (const index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        if (blob !== null) {
          processFile(blob)
        }
      }
    }
  }
  async function handleClipboard (): Promise<void> {
    const text = await navigator.clipboard.readText()
    processText(text)
  }
  let dragover = false
  const selection: number = 0

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
  }

  $: filtered = newValue.length > 0 ? values.filter((it) => it.includes(newValue)) : values

  function onDelete () {
    showPopup(
      MessageBox,
      {
        label: view.string.DeleteObject,
        message: view.string.DeleteObjectConfirm,
        params: { count: filtered.length }
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          values = values.filter((it) => !filtered.includes(it))
          newValue = ''
        }
      }
    )
  }
</script>

<svelte:window on:paste={pasteAction} />

<input
  bind:this={inputFile}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
/>

<Card
  label={core.string.Enum}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={name.trim().length > 0 && values.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-col" on:keydown={onKeydown}>
    <EditBox bind:value={name} placeholder={core.string.Name} kind={'large-style'} fullSize />
    <div class="flex-between my-4">
      <EditBox placeholder={presentation.string.Search} kind={'large-style'} bind:value={newValue} fullSize />
      <div class="flex-row-center flex-no-shrink gap-2 ml-4">
        <ActionIcon icon={IconAdd} label={presentation.string.Add} action={add} size={'small'} />
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
    <div class="scroll" style:margin={'0 -.5rem'}>
      <div class="box flex max-h-125">
        <EnumValuesList bind:values bind:filtered on:remove={(e) => remove(e.detail)} />
      </div>
    </div>
  </div>
  <svelte:fragment slot="footer">
    <div
      class="resume flex-center"
      class:solid={dragover}
      on:dragover|preventDefault={() => {
        dragover = true
      }}
      on:dragleave={() => {
        dragover = false
      }}
      on:drop|preventDefault|stopPropagation={fileDrop}
    >
      <ActionIcon
        icon={IconAttachment}
        label={setting.string.ImportEnum}
        action={() => {
          inputFile.click()
        }}
        size={'small'}
      />
    </div>
  </svelte:fragment>
</Card>
