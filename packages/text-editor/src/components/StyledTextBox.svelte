<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import presentation, { MessageViewer } from '@hcengineering/presentation'
  import {
    ActionIcon,
    IconCheck,
    IconClose,
    IconEdit,
    IconSize,
    Label,
    ShowMore,
    resizeObserver
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  export let label: IntlString | undefined = undefined
  export let content: string
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let emphasized: boolean = false
  export let alwaysEdit: boolean = false
  export let showButtons: boolean = true
  export let hideAttachments: boolean = false
  export let buttonSize: IconSize = 'small'
  export let hideExtraButtons: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string = 'max'
  export let previewLimit: number = 240
  export let previewUnlimit: boolean = false
  export let focusable: boolean = false
  export let enableFormatting = false
  export let autofocus = false

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

  let rawValue: string
  let oldContent = ''
  let modified: boolean = false

  $: if (oldContent !== content) {
    oldContent = content
    rawValue = content
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
  let focused = false

  let needFocus = false

  $: if (textEditor && needFocus) {
    textEditor.focus()
    needFocus = false
  }

  export function isEmptyContent (): boolean {
    return textEditor.isEmptyContent()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiComponent styled-box clear-mins"
  class:antiEmphasized={emphasized}
  class:antiEmphasized-focus={(mode === Mode.Edit || alwaysEdit) && focused}
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
      {maxHeight}
      {focusable}
      {enableFormatting}
      {autofocus}
      bind:content={rawValue}
      bind:this={textEditor}
      on:attach
      on:focus={() => {
        focused = true
        dispatch('focus')
      }}
      on:blur={() => {
        focused = false
        dispatch('blur', rawValue)
        if (alwaysEdit) {
          dispatch('value', rawValue)
          content = rawValue
        }
      }}
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
      font-size: 0.75rem;
      color: var(--caption-color);
      opacity: 0.3;
      transition: top 200ms;
      pointer-events: none;
      user-select: none;
    }
  }
</style>
