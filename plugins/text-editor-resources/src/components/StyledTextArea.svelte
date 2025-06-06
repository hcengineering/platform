<script lang="ts">
  import { Markup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { EmptyMarkup } from '@hcengineering/text'
  import textEditor from '@hcengineering/text-editor'
  import { ButtonSize, Label } from '@hcengineering/ui'
  import { AnyExtension } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'

  import { referenceConfig, ReferenceExtension } from './extension/reference'
  import StyledTextEditor from './StyledTextEditor.svelte'

  export let label: IntlString | undefined = undefined
  export let content: Markup | undefined
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder

  export let showButtons = true
  export let buttonSize: ButtonSize = 'small'
  export let focus = false
  export let kind: 'normal' | 'emphasized' | 'indented' = 'normal'
  export let isScrollable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let required = false
  export let enableBackReferences = false

  let rawValue: Markup
  let oldContent: Markup = EmptyMarkup

  $: if (content !== undefined && oldContent !== content) {
    oldContent = content
    rawValue = content
  }

  let editor: StyledTextEditor

  export function submit (): void {
    editor.submit()
  }
  export function isEditable (): boolean {
    return editor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    editor.setEditable(editable)
  }
  const dispatch = createEventDispatcher()

  let needFocus = focus

  $: if (editor !== undefined && needFocus) {
    editor.focus()
    needFocus = false
  }

  function configureExtensions (): AnyExtension[] {
    const completionPlugin = ReferenceExtension.configure({
      ...referenceConfig,
      showDoc (event: MouseEvent, _id: string, _class: string) {
        dispatch('open-document', { event, _id, _class })
      }
    })

    const extensions: AnyExtension[] = []
    if (enableBackReferences) {
      extensions.push(completionPlugin)
    }

    return extensions
  }

  const extensions = configureExtensions()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiComponent styled-box focusable clear-mins"
  class:antiEmphasized={kind === 'emphasized'}
  class:antiIndented={kind === 'indented'}
  on:click={() => {
    editor?.focus()
  }}
>
  {#if label}
    <div>
      <span class="label"><Label {label} /></span>
      {#if required}<span class="error-color">&ast;</span>{/if}
    </div>
  {/if}
  <StyledTextEditor
    {placeholder}
    {showButtons}
    {buttonSize}
    {maxHeight}
    {isScrollable}
    {extensions}
    bind:content={rawValue}
    bind:this={editor}
    on:blur={() => {
      dispatch('value', rawValue)
      content = rawValue
    }}
    on:value={(evt) => {
      rawValue = evt.detail
      dispatch('changeContent', rawValue)
    }}
  >
    <slot />
  </StyledTextEditor>
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
