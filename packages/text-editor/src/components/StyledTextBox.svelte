<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import presentation, { MessageViewer } from '@hcengineering/presentation'
  import {
    ActionIcon,
    ButtonSize,
    IconCheck,
    IconClose,
    IconEdit,
    IconSize,
    Label,
    ShowMore,
    registerFocus,
    resizeObserver
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import type { AnyExtension } from '@tiptap/core'

  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  import { completionConfig } from './extensions'
  import { EmojiExtension } from './extension/emoji'
  import { FocusExtension } from './extension/focus'

  import { ImageRef, FileAttachFunction } from './imageExt'
  import { Node as ProseMirrorNode } from '@tiptap/pm/model'

  export let label: IntlString | undefined = undefined
  export let content: string
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let kind: 'normal' | 'emphasized' | 'indented' = 'normal'
  export let alwaysEdit: boolean = false
  export let showButtons: boolean = true
  export let hideAttachments: boolean = false
  export let buttonSize: ButtonSize = 'medium'
  export let formatButtonSize: IconSize = 'small'
  export let hideExtraButtons: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string = 'max'
  export let previewLimit: number = 240
  export let previewUnlimit: boolean = false
  export let focusable: boolean = false
  export let autofocus = false
  export let enableBackReferences: boolean = false
  export let enableEmojiReplace: boolean = true
  export let isScrollable: boolean = true
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined

  const Mode = {
    View: 1,
    Edit: 2
  }
  export let mode = Mode.View

  export function startEdit (): void {
    rawValue = content ?? ''
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

  let canBlur = true
  let focused = false
  let rawValue: string
  let oldContent = ''
  let modified: boolean = false

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

  let textEditor: StyledTextEditor

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
  const dispatch = createEventDispatcher()

  export function isFocused (): boolean {
    return focused
  }
  let needFocus = false

  $: if (textEditor && needFocus) {
    textEditor.focus()
    needFocus = false
  }

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable = textEditor?.isEditable()
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
  const updateFocus = () => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }

  const handleFocus = (value: boolean) => {
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

  const attachments = new Map<string, ProseMirrorNode>()

  /**
   * @public
   */
  export function removeAttachment (id: string): void {
    const nde = attachments.get(id)
    if (nde !== undefined) {
      textEditor.removeNode(nde)
    }
  }

  function configureExtensions () {
    const imagePlugin = ImageRef.configure({
      inline: true,
      HTMLAttributes: {},
      attachFile,
      reportNode: (id, node) => {
        attachments.set(id, node)
      }
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

    return extensions
  }

  const extensions = configureExtensions()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
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
      {hideAttachments}
      {buttonSize}
      {formatButtonSize}
      {maxHeight}
      {focusable}
      {autofocus}
      {isScrollable}
      {extensions}
      {boundary}
      bind:content={rawValue}
      bind:this={textEditor}
      on:attach
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
