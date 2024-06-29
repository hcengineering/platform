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
  import {
    ModernEditbox,
    IconAdd,
    IconAttachment,
    IconDelete,
    showPopup,
    ModernButton,
    Label,
    ButtonIcon,
    IconMoreV,
    IconMoreV2,
    ModernPopup,
    eventToHTMLElement
  } from '@hcengineering/ui'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import setting from '../plugin'
  import EnumValuesList from './EnumValuesList.svelte'
  import IconCrossedArrows from './icons/CrossedArrows.svelte'
  import IconBulletList from './icons/BulletList.svelte'
  import Report from './icons/Report.svelte'

  export let value: Enum

  const client = getClient()

  let newValue: string = ''
  let newItem: boolean = false
  let opened: boolean = false

  async function add () {
    if (newValue.trim().length === 0) return
    if (matched) return
    await client.update(value, {
      $push: { enumValues: newValue }
    })
    newValue = ''
    newItem = false
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
    if (evt.key === 'Escape') {
      newItem = false
      newValue = ''
    }
  }
  // $: filtered = newValue.length > 0 ? value.enumValues.filter((it) => it.includes(newValue)) : []
  $: matched = value.enumValues.includes(newValue.trim())

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
  // function onDelete () {
  //   showPopup(
  //     MessageBox,
  //     {
  //       label: view.string.DeleteObject,
  //       message: view.string.DeleteObjectConfirm,
  //       params: { count: filtered.length }
  //     },
  //     undefined,
  //     (result?: boolean) => {
  //       if (result === true) {
  //         client.update(value, {
  //           $pull: { enumValues: { $in: filtered } }
  //         })
  //         newValue = ''
  //       }
  //     }
  //   )
  // }

  async function update (value: Enum): Promise<void> {
    await client.update(value, {
      name: value.name
    })
  }

  async function onDrop () {
    await client.update(value, { enumValues: value.enumValues })
  }

  const items: (DropdownIntlItem & { action: () => void })[] = [
    {
      id: 'import',
      icon: IconAttachment,
      label: setting.string.ImportEnum,
      action: () => {
        inputFile.click()
      }
    },
    {
      id: 'paste',
      icon: Report,
      label: setting.string.ImportEnumCopy,
      action: () => {
        handleClipboard()
      }
    }
  ]

  const openPopup = (ev: MouseEvent): void => {
    if (!opened) {
      opened = true
      showPopup(ModernPopup, { items }, eventToHTMLElement(ev), (result) => {
        if (result) items.find((it) => it.id === result)?.action()
        opened = false
      })
    }
  }
</script>

<div class="flex-between flex-gap-2">
  <ModernEditbox
    bind:value={value.name}
    label={setting.string.EnumTitle}
    kind={'ghost'}
    size={'large'}
    on:change={() => update(value)}
  />
  <ModernButton
    icon={IconCrossedArrows}
    label={setting.string.ProjectTypesCount}
    labelParams={{ count: 0 }}
    disabled
    kind={'tertiary'}
    size={'medium'}
    hasMenu
  />
</div>
<input
  bind:this={inputFile}
  disabled={inputFile == null}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
/>

<div class="hulyTableAttr-container mt-6">
  <div class="hulyTableAttr-header font-medium-12">
    <IconBulletList size={'small'} />
    <span><Label label={setting.string.Options} /></span>
    <div class="buttons-group tertiary-textColor">
      <ButtonIcon
        kind={'tertiary'}
        icon={IconMoreV}
        size={'small'}
        pressed={opened}
        inheritColor
        hasMenu
        on:click={(ev) => {
          openPopup(ev)
        }}
      />
      <ButtonIcon
        kind={'primary'}
        icon={IconAdd}
        size={'small'}
        tooltip={{ label: setting.string.Add }}
        on:click={() => {
          newItem = true
        }}
      />
    </div>
  </div>
  {#if value.enumValues.length > 0 || newItem}
    <div class="hulyTableAttr-content options">
      <EnumValuesList
        bind:values={value.enumValues}
        disableMouseOver={newItem}
        on:remove={(e) => remove(e.detail)}
        on:drop={onDrop}
      />
      {#if newItem}
        <div class="hulyTableAttr-content__row hovered">
          <div class="hulyTableAttr-content__row-dragMenu">
            <IconMoreV2 size={'small'} />
          </div>
          <div class="hulyTableAttr-content__row-label font-regular-14 accent grow">
            <ModernEditbox
              kind={'ghost'}
              size={'small'}
              label={setting.string.EnterOptionTitle}
              on:keydown={handleKeydown}
              on:blur={() => {
                add()
                newItem = false
              }}
              bind:value={newValue}
              width={'100%'}
              autoFocus
            />
          </div>
          {#if matched}
            <div class="hulyChip-item error font-medium-12">
              <Label label={presentation.string.Match} />
            </div>
          {/if}
          <ButtonIcon
            kind={'tertiary'}
            icon={IconDelete}
            size={'small'}
            on:click={() => {
              newValue = ''
              newItem = false
            }}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>
