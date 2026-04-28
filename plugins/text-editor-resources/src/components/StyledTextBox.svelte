<script lang="ts">
  import { Markup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import presentation, { MessageViewer, getFileUrl, getImageSize, imageSizeToRatio } from '@hcengineering/presentation'
  import { EmptyMarkup, mergeKitOptions } from '@hcengineering/text'
  import textEditor, { RefAction } from '@hcengineering/text-editor'
  import {
    ActionIcon,
    ButtonSize,
    IconCheck,
    IconClose,
    IconEdit,
    Label,
    PopupAlignment,
    ShowMore,
    getEventPositionElement,
    getPopupPositionElement,
    registerFocus,
    resizeObserver
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import StyledTextEditor from './StyledTextEditor.svelte'

  import { EditorKitOptions } from '../kits/editor-kit'
  import { addTableHandler } from '../utils'
  import view from '@hcengineering/view'
  import { type FileAttachFunction } from './extension/types'
  import { inlineCommandsConfig } from './extensions'

  export let label: IntlString | undefined = undefined
  export let content: Markup
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder

  export let kind: 'normal' | 'emphasized' | 'indented' = 'normal'
  export let alwaysEdit: boolean = false
  export let extraActions: RefAction[] = []
  export let showButtons: boolean = true
  export let buttonSize: ButtonSize = 'medium'
  export let hideExtraButtons: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string = 'max'
  export let previewLimit: number = 240
  export let previewUnlimit: boolean = false
  export let focusable: boolean = false
  export let autofocus = false
  export let enableInlineCommands: boolean = true
  export let isScrollable: boolean = true
  export let boundary: HTMLElement | undefined = undefined
  export let readonly: boolean = false
  export let kitOptions: Partial<EditorKitOptions> = {}

  export let attachFile: FileAttachFunction | undefined = undefined

  // TODO: Expose
  const Mode = {
    View: 1,
    Edit: 2
  }
  export let mode = Mode.View

  export function startEdit (): void {
    rawValue = content ?? EmptyMarkup
    needFocus = true
    mode = Mode.Edit
  }
  export function saveEdit (): void {
    dispatch('value', rawValue)
    content = rawValue
    mode = Mode.View
  }
  export function cancelEdit (): void {
    rawValue = content
    mode = Mode.View
  }

  const dispatch = createEventDispatcher()

  let canBlur = true
  let focused = false
  let rawValue: Markup
  let oldContent: Markup = EmptyMarkup
  let modified: boolean = false

  let editor: StyledTextEditor

  $: if (oldContent !== content) {
    oldContent = content
    if (rawValue !== content) {
      rawValue = content
      editor?.setContent(content)
    }
    modified = false
  }
  $: if (!modified && rawValue !== content) modified = true
  $: dispatch('change', modified)

  $: editor?.setEditable(!readonly)

  export function submit (): void {
    editor.submit()
  }
  export function focus (): void {
    editor.focus()
  }
  export function isEditable (): boolean {
    return editor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    editor.setEditable(editable)
  }
  export function setContent (data: string): void {
    editor.setContent(data)
  }

  export function isFocused (): boolean {
    return focused
  }
  let needFocus = false

  $: if (editor !== undefined && needFocus) {
    editor.focus()
    needFocus = false
  }

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable: boolean = editor != null ? editor.isEditable() : false
      if (editable) {
        focused = true
        focus()
      }
      return editable
    },
    isFocus: () => focused,
    canBlur: () => {
      if (focused) {
        return canBlur
      }
      return true
    }
  })
  const updateFocus = (): void => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }

  const handleFocus = (value: boolean): void => {
    focused = value
    if (focused) {
      updateFocus()
      dispatch('focus')
    } else {
      dispatch('blur', rawValue)
      if (alwaysEdit) {
        dispatch('value', rawValue)
        content = rawValue
      }
    }
  }

  /**
   * @public
   */
  export function removeAttachment (id: string): void {
    editor.removeAttachment(id)
  }

  async function handleCommandSelected (id: string, pos: number, targetItem?: MouseEvent | HTMLElement): Promise<void> {
    switch (id) {
      case 'image':
        handleAttachImage()
        break
      case 'table': {
        let position: PopupAlignment | undefined = undefined
        if (targetItem !== undefined) {
          position =
            targetItem instanceof MouseEvent ? getEventPositionElement(targetItem) : getPopupPositionElement(targetItem)
        }

        void addTableHandler(editor.editorHandler.insertTable, position)
        break
      }
      case 'code-block':
        editor.editorHandler.insertCodeBlock(pos)
        break
      case 'separator-line':
        editor.editorHandler.insertSeparatorLine()
        break
      case 'mermaid':
        editor.getEditor()?.commands.insertContentAt(pos, { type: 'mermaid' })
        break
    }
  }

  let inputImage: HTMLInputElement

  export function handleAttachImage (): void {
    inputImage.click()
  }

  async function createInlineImage (file: File): Promise<void> {
    if (!file.type.startsWith('image/') || attachFile === undefined) {
      return
    }

    const attached = await attachFile(file)
    if (attached === undefined) {
      return
    }

    const size = await getImageSize(file)

    editor.editorHandler.insertContent(
      {
        type: 'image',
        attrs: {
          'file-id': attached.file,
          width: imageSizeToRatio(size.width, size.pixelRatio)
        }
      },
      {
        updateSelection: false
      }
    )
  }

  async function fileSelected (): Promise<void> {
    const list = inputImage.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await createInlineImage(file)
      }
    }
    inputImage.value = ''
  }
</script>

<input
  bind:this={inputImage}
  multiple
  type="file"
  name="file"
  id="imageInput"
  accept="image/*"
  style="display: none"
  disabled={readonly}
  on:change={fileSelected}
/>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="flex-col styled-box"
  class:antiEmphasized={kind === 'emphasized'}
  class:antiIndented={kind === 'indented'}
  class:focusable={(mode === Mode.Edit || alwaysEdit) && focused}
  on:click={() => {
    if (alwaysEdit && focused && !readonly) {
      editor?.focus()
    }
  }}
  use:resizeObserver={() => {
    dispatch('changeSize')
  }}
>
  {#if label}
    <div class="label"><Label {label} /></div>
  {/if}
  {#if (mode !== Mode.View || alwaysEdit) && !readonly}
    <StyledTextEditor
      {placeholder}
      {showButtons}
      {buttonSize}
      {maxHeight}
      {focusable}
      {autofocus}
      {isScrollable}
      {extraActions}
      {boundary}
      kitOptions={mergeKitOptions({
        emoji: true,
        textColorStyling: true,
        hooks: {
          focus: {
            onCanBlur: (value) => (canBlur = value),
            onFocus: handleFocus
          }
        },
        shortcuts: {
          imageUpload: {
            attachFile,
            getFileUrl
          }
        },
        inlineCommands: inlineCommandsConfig(
          handleCommandSelected,
          attachFile == null ? ['drawing-board', 'todo-list', 'image'] : ['drawing-board', 'todo-list']
        ),
        ...kitOptions,
        leftMenu: {
          width: 20,
          height: 20,
          marginX: 8,
          className: 'tiptap-left-menu',
          icon: view.icon.Add,
          iconProps: {
            className: 'svg-tiny',
            fill: 'currentColor'
          },
          items: [
            { id: 'image', label: textEditor.string.Image, icon: view.icon.Image },
            { id: 'table', label: textEditor.string.Table, icon: view.icon.Table2 },
            { id: 'code-block', label: textEditor.string.CodeBlock, icon: view.icon.CodeBlock },
            { id: 'separator-line', label: textEditor.string.SeparatorLine, icon: view.icon.SeparatorLine },
            { id: 'mermaid', label: textEditor.string.MermaidDiargram, icon: view.icon.Model }
          ],
          handleSelect: handleCommandSelected
        }
      })}
      bind:content={rawValue}
      bind:this={editor}
      on:value={(evt) => {
        rawValue = evt.detail
        if (alwaysEdit) {
          content = evt.detail
        }
        dispatch('changeContent', evt.detail)
      }}
    >
      <slot name="actions" slot="actions" />
      {#if !alwaysEdit && !hideExtraButtons}
        <div class="flex flex-reverse flex-grow gap-2 reverse">
          <ActionIcon
            icon={IconCheck}
            size={'medium'}
            direction={'bottom'}
            label={presentation.string.Save}
            action={saveEdit}
          />
          <ActionIcon
            size={'medium'}
            icon={IconClose}
            direction={'top'}
            label={presentation.string.Cancel}
            action={cancelEdit}
          />
        </div>
      {/if}
    </StyledTextEditor>
  {:else}
    <div class="flex-col">
      {#if content}
        <ShowMore limit={previewLimit} ignore={previewUnlimit}>
          <MessageViewer message={content} />
        </ShowMore>
      {/if}
    </div>
    {#if !alwaysEdit && !hideExtraButtons && !readonly}
      <div class="flex flex-reverse">
        <ActionIcon
          size={'medium'}
          icon={IconEdit}
          direction={'top'}
          label={textEditor.string.Edit}
          action={startEdit}
        />
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  :global(.tiptap-left-menu) {
    display: flex;
    color: var(--theme-trans-color);
    width: 20px;
    height: 20px;
    border-radius: 20%;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition:
      background-color 0.2s,
      opacity 0.2s;
    position: absolute;
    cursor: pointer;
    transform: translateX(34px); /* Сдвигаем внутрь видимой зоны */

    &:hover {
      background-color: var(--theme-button-hovered);
      color: var(--theme-content-color);
    }

    &.hidden {
      opacity: 0;
      pointer-events: none;
    }
  }

  .styled-box {
    flex-grow: 1;

    .label {
      padding-bottom: 0.25rem;
      color: var(--theme-halfcontent-color);
      transition: top 200ms;
      pointer-events: none;
      user-select: none;
    }

    :global(.textInput),
    :global(.inputMsg),
    :global(.select-text),
    :global(.inputMsg > div) {
      overflow: visible !important;
    }

    :global(.select-text) {
      padding-left: 40px; /* Увеличил отступ */
      position: relative;
    }
  }
</style>
