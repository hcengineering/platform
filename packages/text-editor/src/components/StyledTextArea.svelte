<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { ButtonSize, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  export let label: IntlString | undefined = undefined
  export let content: string | undefined
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let showButtons = true
  export let buttonSize: ButtonSize = 'small'
  export let focus = false
  export let kind: 'normal' | 'emphasized' | 'indented' = 'normal'
  export let isScrollable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let required = false

  let rawValue: string
  let oldContent = ''

  $: if (content && oldContent !== content) {
    oldContent = content
    rawValue = content
  }

  let textEditor: StyledTextEditor

  export function submit (): void {
    textEditor.submit()
  }
  export function isEditable (): boolean {
    return textEditor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    textEditor.setEditable(editable)
  }
  const dispatch = createEventDispatcher()
  let focused = false

  let needFocus = focus

  $: if (textEditor && needFocus) {
    textEditor.focus()
    needFocus = false
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiComponent styled-box focusable clear-mins"
  class:antiEmphasized={kind === 'emphasized'}
  class:antiIndented={kind === 'indented'}
  on:click={() => {
    textEditor?.focus()
  }}
>
  {#if label}
    <div>
      <span class="label"><Label {label} /></span>
      {#if required}<span class="error-color">&ast</span>{/if}
    </div>
  {/if}
  <StyledTextEditor
    {placeholder}
    {showButtons}
    {buttonSize}
    {maxHeight}
    {isScrollable}
    bind:content={rawValue}
    bind:this={textEditor}
    on:focus={() => {
      focused = true
    }}
    on:blur={() => {
      focused = false
      dispatch('value', rawValue)
      content = rawValue
    }}
    on:value={(evt) => {
      rawValue = evt.detail
      dispatch('changeContent')
    }}
  >
    <slot />
    <svelte:fragment slot="right">
      <slot name="right" />
    </svelte:fragment>
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
