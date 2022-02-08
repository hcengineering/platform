<script lang="ts">
  import { IntlString } from '@anticrm/platform'
  import { MessageViewer } from '@anticrm/presentation'
  import { ActionIcon, IconCheck, IconClose, IconEdit } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import StyledTextEditor from './StyledTextEditor.svelte'

  export let content: string
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  let rawValue: string

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
</script>

<div class="antiComponent styled-box">
  {#if mode !== Mode.View}
    <StyledTextEditor
      {placeholder}
      bind:content={rawValue}
      bind:this={textEditor}
      on:value={(evt) => {
        rawValue = evt.detail
      }}
    >
      <div class="flex flex-reverse flex-grow">
        <div class="ml-2">
          <!-- disabled={rawValue.trim().length === 0} -->
          <ActionIcon
            icon={IconCheck}
            size={'medium'}
            direction={'bottom'}
            label={textEditorPlugin.string.Save}
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
          label={textEditorPlugin.string.Cancel}
          action={() => {
            mode = Mode.View
          }}
        />
      </div>
    </StyledTextEditor>
  {:else}
    <div class="text">
      {#if content}
        <MessageViewer message={content} />
      {/if}
    </div>
    <div class="flex flex-reverse">
      <ActionIcon
        size={'medium'}
        icon={IconEdit}
        direction={'top'}
        label={textEditorPlugin.string.Edit}
        action={() => {
          rawValue = content ?? ''
          mode = Mode.Edit
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .styled-box {
    flex-grow: 1;
  }
  .text {
    flex-grow: 1;
    line-height: 150%;
  }
</style>
