<script lang="ts">
  import { Markup } from '@hcengineering/core'
  import { IntlString, getMetadata } from '@hcengineering/platform'
  import presentation, { MessageViewer, getFileUrl, getImageSize } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text'
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
  import type { AnyExtension } from '@tiptap/core'

  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  import { completionConfig, inlineCommandsConfig } from './extensions'
  import { EmojiExtension } from './extension/emoji'
  import { FocusExtension } from './extension/focus'
  import { ImageExtension } from './extension/imageExt'
  import { InlineCommandsExtension } from './extension/inlineCommands'
  import { type FileAttachFunction } from './extension/types'
  import { RefAction } from '../types'
  import { addTableHandler } from '../utils'

  export let label: IntlString | undefined = undefined
  export let content: Markup
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

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
  export let enableBackReferences: boolean = false
  export let enableEmojiReplace: boolean = true
  export let enableInlineCommands: boolean = true
  export let isScrollable: boolean = true
  export let boundary: HTMLElement | undefined = undefined

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

  let textEditor: StyledTextEditor

  $: if (oldContent !== content) {
    oldContent = content
    if (rawValue !== content) {
      rawValue = content
      textEditor?.setContent(content)
    }
    modified = false
  }
  $: if (!modified && rawValue !== content) modified = true
  $: dispatch('change', modified)

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
  }
  export function isEditable (): boolean {
    return textEditor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    textEditor.setEditable(editable)
  }
  export function setContent (data: string): void {
    textEditor.setContent(data)
  }

  export function isFocused (): boolean {
    return focused
  }
  let needFocus = false

  $: if (textEditor !== undefined && needFocus) {
    textEditor.focus()
    needFocus = false
  }

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable = textEditor?.isEditable() ?? false
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
    textEditor.removeAttachment(id)
  }

  function configureExtensions (): AnyExtension[] {
    const imagePlugin = ImageExtension.configure({
      inline: true,
      HTMLAttributes: {},
      attachFile,
      uploadUrl: getMetadata(presentation.metadata.UploadURL)
    })

    const completionPlugin = Completion.configure({
      ...completionConfig,
      showDoc (event: MouseEvent, _id: string, _class: string) {
        dispatch('open-document', { event, _id, _class })
      }
    })

    const extensions: AnyExtension[] = []
    if (enableBackReferences) {
      extensions.push(completionPlugin)
    }
    extensions.push(
      imagePlugin,
      FocusExtension.configure({ onCanBlur: (value: boolean) => (canBlur = value), onFocus: handleFocus })
    )
    if (enableEmojiReplace) {
      extensions.push(EmojiExtension.configure())
    }

    if (enableInlineCommands) {
      extensions.push(
        InlineCommandsExtension.configure(
          inlineCommandsConfig(handleCommandSelected, attachFile === undefined ? ['image'] : [])
        )
      )
    }

    return extensions
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

        addTableHandler(textEditor.editorHandler.insertTable, position)
        break
      }
      case 'code-block':
        textEditor.editorHandler.insertCodeBlock(pos)

        break
      case 'separator-line':
        textEditor.editorHandler.insertSeparatorLine()
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

    const size = await getImageSize(
      file,
      getFileUrl(attached.file, 'full', getMetadata(presentation.metadata.UploadURL))
    )

    textEditor.editorHandler.insertContent(
      {
        type: 'image',
        attrs: {
          'file-id': attached.file,
          width: Math.round(size.width / size.pixelRatio)
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

  const extensions = configureExtensions()
</script>

<input
  bind:this={inputImage}
  multiple
  type="file"
  name="file"
  id="imageInput"
  accept="image/*"
  style="display: none"
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
    if (alwaysEdit && focused) {
      textEditor?.focus()
    }
  }}
  use:resizeObserver={() => {
    dispatch('changeSize')
  }}
>
  {#if label}
    <div class="label"><Label {label} /></div>
  {/if}
  {#if mode !== Mode.View || alwaysEdit}
    <StyledTextEditor
      {placeholder}
      {showButtons}
      {buttonSize}
      {maxHeight}
      {focusable}
      {autofocus}
      {isScrollable}
      {extensions}
      {extraActions}
      {boundary}
      bind:content={rawValue}
      bind:this={textEditor}
      on:value={(evt) => {
        rawValue = evt.detail
        if (alwaysEdit) {
          content = evt.detail
        }
        dispatch('changeContent', evt.detail)
      }}
    >
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
    {#if !alwaysEdit && !hideExtraButtons}
      <div class="flex flex-reverse">
        <ActionIcon
          size={'medium'}
          icon={IconEdit}
          direction={'top'}
          label={textEditorPlugin.string.Edit}
          action={startEdit}
        />
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .styled-box {
    flex-grow: 1;

    .label {
      padding-bottom: 0.25rem;
      color: var(--theme-halfcontent-color);
      transition: top 200ms;
      pointer-events: none;
      user-select: none;
    }
  }
</style>
