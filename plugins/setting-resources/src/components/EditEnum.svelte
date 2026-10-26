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
  import { Analytics } from '@hcengineering/analytics'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import {
    IconAdd,
    IconAttachment,
    IconDelete,
    showPopup,
    Modal,
    ModernEditbox,
    Label,
    ButtonIcon,
    IconMoreV,
    IconMoreV2,
    eventToHTMLElement,
    ModernPopup
  } from '@hcengineering/ui'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'
  import { canChangeEnumValues } from '../enumValuesPolicy'
  import EnumValuesList from './EnumValuesList.svelte'
  import IconBulletList from './icons/BulletList.svelte'
  import Report from './icons/Report.svelte'

  export let value: Enum | undefined
  export let name: string = value?.name ?? ''
  export let values: string[] = [...(value?.enumValues ?? [])]
  export let title: IntlString = setting.string.EditEnum

  const client = getClient()
  const dispatch = createEventDispatcher()

  let matched = false
  let newValue = ''
  let protectedOptions = false

  $: matched = values.includes(newValue.trim())

  function handleError (error: unknown): void {
    Analytics.handleError(error)
  }

  async function save (): Promise<void> {
    if (value === undefined) {
      const _id = await client.createDoc(core.class.Enum, core.space.Model, {
        name,
        enumValues: values
      })
      dispatch('close', _id)
    } else {
      if (
        !canChangeEnumValues(
          client.getModel().findObject(value._id) ?? value,
          values,
          client.getModel().findAllSync(core.class.Attribute, {}),
          client.getHierarchy()
        )
      ) {
        protectedOptions = true
        return
      }
      await client.update(value, {
        name,
        enumValues: values
      })
      dispatch('close', value._id)
    }
  }

  function add (): void {
    newValue = newValue.trim()
    if (newValue.length === 0) return
    if (matched) return
    values.push(newValue)
    values = values
    newValue = ''
  }

  function remove (value: string): void {
    values = values.filter((p) => p !== value)
  }

  const handleKeydown = (evt: KeyboardEvent): void => {
    if (evt.key === 'Enter') {
      add()
    }
    if (evt.key === 'Escape') {
      newItem = false
      newValue = ''
      evt.stopPropagation()
    }
  }

  let newItem: boolean = false
  let opened: boolean = false
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

  function fileSelected (): void {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        void processFile(file).catch(handleError)
      }
    }
    inputFile.value = ''
  }

  function fileDrop (e: DragEvent): void {
    dragover = false
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        void processFile(file).catch(handleError)
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
          void processFile(blob).catch(handleError)
        }
      }
    }
  }
  async function handleClipboard (): Promise<void> {
    const text = await navigator.clipboard.readText()
    processText(text)
  }

  let dragover = false
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
        void handleClipboard().catch(handleError)
      }
    }
  ]

  const openPopup = (ev: MouseEvent): void => {
    if (!opened) {
      opened = true
      showPopup(ModernPopup, { items }, eventToHTMLElement(ev), (result) => {
        if (typeof result === 'string') items.find((it) => it.id === result)?.action()
        opened = false
      })
    }
  }

  function showConfirmationDialog (): void {
    const isEnumEmpty = values.length === 0
    const oldValues = value?.enumValues ?? []
    const isEnumSame = values.length === oldValues.length && values.every((it, i) => it === oldValues[i])

    if (isEnumEmpty || isEnumSame) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: setting.string.NewEnumDialogClose,
          message: setting.string.NewEnumDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) dispatch('close')
        }
      )
    }
  }
</script>

<svelte:window on:paste={pasteAction} />

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

<Modal
  label={title}
  type={'type-popup'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={name.trim().length > 0 && values.length > 0}
  onCancel={showConfirmationDialog}
>
  <div class="flex-col">
    <ModernEditbox bind:value={name} label={setting.string.EnumTitle} kind={'ghost'} size={'large'} width={'100%'} />
    {#if value !== undefined}
      <div class="font-regular-12 secondary-textColor mt-2">
        <Label label={setting.string.EnumRenameHint} />
      </div>
    {/if}
    {#if protectedOptions}
      <div class="error font-regular-12 mt-2" role="alert">
        <Label label={setting.string.ReferencedEnumValue} />
      </div>
    {/if}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="hulyTableAttr-container mt-6"
      class:dragDropZone={dragover}
      on:dragover|preventDefault={() => {
        dragover = true
      }}
      on:dragleave={() => {
        dragover = false
      }}
      on:drop|preventDefault|stopPropagation={fileDrop}
    >
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
              if (newItem) {
                add()
              } else {
                newItem = true
              }
            }}
          />
        </div>
      </div>
      {#if values.length > 0 || newItem}
        <div class="hulyTableAttr-content options">
          <EnumValuesList
            bind:values
            on:update={(e) => {
              values = e.detail
            }}
            on:remove={(e) => {
              remove(e.detail)
            }}
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
                    newValue = newValue.trim()
                    if (newValue.length === 0) return
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
  </div>
</Modal>

<style lang="scss">
  .dragDropZone {
    border: 2px dashed var(--theme-popup-hover);
  }
</style>
