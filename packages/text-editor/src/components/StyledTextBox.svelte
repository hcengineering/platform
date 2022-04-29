<script lang="ts">
  import { IntlString } from '@anticrm/platform'
  import presentation, { MessageViewer } from '@anticrm/presentation'
  import { ActionIcon, IconCheck, IconClose, IconEdit, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  export let label: IntlString | undefined = undefined
  export let content: string
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let emphasized = false
  export let alwaysEdit = false
  export let showButtons = true

  let rawValue: string
  let oldContent = ''

  $: if (oldContent !== content) {
    oldContent = content
    rawValue = content
  }

  const Mode = {
    View: 1,
    Edit: 2
  }
  let mode = Mode.View

  let textEditor: StyledTextEditor

  export function submit (): void {
    textEditor.submit()
  }
  const dispatch = createEventDispatcher()
  let focused = false

  let needFocus = false

  $: if (textEditor && needFocus) {
    textEditor.focus()
    needFocus = false
  }
</script>

<div
  class="antiComponent styled-box"
  class:emphasized
  class:emphasized-focus={(mode === Mode.Edit || alwaysEdit) && focused}
  on:click={() => {
    if (alwaysEdit && focused) {
      textEditor?.focus()
    }
  }}
>
  {#if label}
    <div class="label"><Label {label} /></div>
  {/if}
  {#if mode !== Mode.View || alwaysEdit}
    <StyledTextEditor
      {placeholder}
      {showButtons}
      bind:content={rawValue}
      bind:this={textEditor}
      on:focus={() => {
        focused = true
      }}
      on:blur={() => {
        focused = false
        if (alwaysEdit) {
          dispatch('value', rawValue)
          content = rawValue
        }
      }}
      on:value={(evt) => {
        rawValue = evt.detail
      }}
    >
      {#if !alwaysEdit}
        <div class="flex flex-reverse flex-grow">
          <div class="ml-2">
            <!-- disabled={rawValue.trim().length === 0} -->
            <ActionIcon
              icon={IconCheck}
              size={'medium'}
              direction={'bottom'}
              label={presentation.string.Save}
              action={() => {
                dispatch('value', rawValue)
                content = rawValue
                mode = Mode.View
              }}
            />
          </div>
          <ActionIcon
            size={'medium'}
            icon={IconClose}
            direction={'top'}
            label={presentation.string.Cancel}
            action={() => {
              mode = Mode.View
            }}
          />
        </div>
      {/if}
    </StyledTextEditor>
  {:else}
    <div class="text">
      {#if content}
        <MessageViewer message={content} />
      {/if}
    </div>
    {#if !alwaysEdit}
      <div class="flex flex-reverse">
        <ActionIcon
          size={'medium'}
          icon={IconEdit}
          direction={'top'}
          label={textEditorPlugin.string.Edit}
          action={() => {
            rawValue = content ?? ''
            needFocus = true
            mode = Mode.Edit
          }}
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
      color: var(--theme-caption-color);
      opacity: 0.3;
      transition: top 200ms;
      pointer-events: none;
      user-select: none;
    }
  }
  .emphasized {
    padding: 1rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-hover);
    border-radius: 0.5rem;
    &.emphasized-focus {
      background-color: var(--theme-bg-focused-color);
      border-color: var(--theme-bg-focused-border);
    }
  }
  .text {
    overflow: auto;
    flex-grow: 1;
    line-height: 150%;
  }
</style>
