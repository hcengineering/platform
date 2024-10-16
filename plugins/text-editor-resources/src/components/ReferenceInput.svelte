<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Class, Doc, Markup, Ref } from '@hcengineering/core'
  import { Asset, getResource, IntlString, Resource } from '@hcengineering/platform'
  import { EmptyMarkup, getInlineCommand, isEmptyMarkup, markupToText } from '@hcengineering/text'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    handler,
    registerFocus,
    deviceOptionsStore as deviceInfo,
    checkAdaptiveMatching
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { FocusPosition } from '@tiptap/core'
  import { EditorView } from '@tiptap/pm/view'
  import textEditor, {
    InlineCommandAction,
    InlineShortcutAction,
    RefAction,
    TextEditorHandler,
    TextEditorInlineCommand
  } from '@hcengineering/text-editor'

  import { InlineCommandsExtension } from './extension/inlineCommands'
  import { Completion } from '../Completion'
  import TextEditor from './TextEditor.svelte'
  import { defaultRefActions, getModelRefActions } from './editor/actions'
  import { completionConfig, inlineCommandsConfig } from './extensions'
  import { EmojiExtension } from './extension/emoji'
  import { IsEmptyContentExtension } from './extension/isEmptyContent'
  import Send from './icons/Send.svelte'
  import { getInlineCommands } from '../utils'

  export let context: { objectId: Ref<Doc>, objectClass: Ref<Class<Doc>> } | undefined = undefined
  export let content: Markup = EmptyMarkup
  export let showHeader = false
  export let showActions = true
  export let showSend = true
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let kindSend: ButtonKind = 'ghost'
  export let haveAttachment = false
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] = []
  export let loading: boolean = false
  export let focusable: boolean = false
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let canEmbedFiles = true
  export let canEmbedImages = true
  export let onPaste: ((view: EditorView, event: ClipboardEvent) => boolean) | undefined = undefined

  const dispatch = createEventDispatcher()
  const buttonSize = 'medium'

  let editor: TextEditor | undefined = undefined

  let isEmpty = true

  $: setContent(content)
  $: devSize = $deviceInfo.size
  $: shrinkButtons = checkAdaptiveMatching(devSize, 'sm')

  $: isEmptyContent = isEmpty || isEmptyMarkup(content)
  $: canSubmit = (haveAttachment || !isEmptyContent) && !loading

  function setContent (content: Markup): void {
    editor?.setContent?.(content)
  }

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.insertText(text)
    },
    insertMarkup: (markup) => {
      editor?.insertMarkup(markup)
    },
    insertTemplate: (name, markup) => {
      editor?.insertMarkup(markup)
    },
    insertTable (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) {
      editor?.insertTable(options)
    },
    insertCodeBlock: () => {
      editor?.insertCodeBlock()
    },
    insertSeparatorLine: () => {
      editor?.insertSeparatorLine()
    },
    insertContent: (content) => {
      editor?.insertContent(content)
    },
    focus: () => {
      editor?.focus()
    }
  }

  let actions: RefAction[] = defaultRefActions.concat(...extraActions).sort((a, b) => a.order - b.order)

  void getModelRefActions().then((modelActions) => {
    actions = actions.concat(...modelActions).sort((a, b) => a.order - b.order)
  })

  export function submit (): void {
    editor?.submit()
  }

  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable: boolean = editor?.isEditable() ?? false
      if (editable) {
        focused = true
        editor?.focus()
      }
      return editable
    },
    isFocus: () => focused
  })
  const updateFocus = (): void => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }
  const completionPlugin = Completion.configure({
    ...completionConfig,
    showDoc (event: MouseEvent, _id: string, _class: string) {
      dispatch('open-document', { event, _id, _class })
    }
  })

  let allCommands: TextEditorInlineCommand[] = []

  void getInlineCommands({ category: 'general' }).then((commands) => {
    allCommands = commands
  })

  async function handleShortcut (
    item: TextEditorInlineCommand,
    pos: number,
    targetItem?: MouseEvent | HTMLElement
  ): Promise<void> {
    if (item.type === 'shortcut') {
      const fn = await getResource(item.action as Resource<InlineShortcutAction>)
      await fn({ editor: editorHandler }, pos, targetItem)
    }
  }

  async function processCommand (command: TextEditorInlineCommand, markup: Markup): Promise<void> {
    if (context === undefined) return
    const fn = await getResource(command.action as Resource<InlineCommandAction>)
    await fn(markup, context)
  }

  function handleSubmit (event: CustomEvent): void {
    if (!canSubmit) return

    const inlineCommandName = getInlineCommand(content)
    const inlineCommand =
      inlineCommandName !== undefined ? allCommands.find((it) => it.command === inlineCommandName) : undefined

    if (inlineCommand?.action !== undefined) {
      void processCommand(inlineCommand, content)
      dispatch('update', { message: EmptyMarkup })
    } else {
      dispatch('message', event.detail)
    }

    content = EmptyMarkup
    editor?.clear()
  }
</script>

<div class="ref-container" class:focusable>
  {#if showHeader && $$slots.header}
    <div class="header">
      <slot name="header" />
    </div>
  {/if}
  <div class="text-input">
    <TextEditor
      bind:content
      bind:this={editor}
      {autofocus}
      {boundary}
      {canEmbedFiles}
      {canEmbedImages}
      on:content={handleSubmit}
      on:blur={() => {
        focused = false
        dispatch('blur')
      }}
      on:focus={() => {
        focused = true
        updateFocus()
        dispatch('focus')
      }}
      extensions={[
        completionPlugin,
        InlineCommandsExtension.configure(inlineCommandsConfig(allCommands, handleShortcut)),
        EmojiExtension.configure(),
        IsEmptyContentExtension.configure({ onChange: (value) => (isEmpty = value) })
      ]}
      {onPaste}
      on:update
      placeholder={placeholder ?? textEditor.string.EditorPlaceholder}
    />
  </div>
  {#if showActions || showSend}
    <div class="buttons-panel flex-between clear-mins">
      <div class="buttons-group {shrinkButtons ? 'xxsmall-gap' : 'xsmall-gap'}">
        {#if showActions}
          {#each actions as a}
            <Button
              disabled={a.disabled ??
                (a.disabledFn != null && editor ? a.disabledFn(editor.getEditor(), content) : false)}
              icon={a.icon}
              iconProps={{ size: buttonSize, ...a.iconProps }}
              kind="ghost"
              showTooltip={{ label: a.label }}
              size={buttonSize}
              on:click={handler(a, (a, evt) => {
                if (a.disabled !== true) {
                  handleAction(a, evt)
                }
              })}
            />
            {#if a.order % 10 === 1}
              <div class="buttons-divider" />
            {/if}
          {/each}
        {/if}
      </div>

      {#if showSend}
        <Button
          {loading}
          disabled={!canSubmit}
          icon={iconSend ?? Send}
          iconProps={{ size: buttonSize }}
          kind={kindSend}
          size={buttonSize}
          showTooltip={{
            label: labelSend ?? textEditor.string.Send
          }}
          on:click={submit}
        />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 2.5rem;
    border: 0.0625rem solid var(--theme-refinput-border);
    border-radius: 0.375rem;

    &.focusable {
      &:focus-within {
        border-color: var(--primary-edit-border-color);
      }
    }
  }

  .header {
    padding: 0.325rem 0.75rem;
    border-bottom: 0.0625rem solid var(--theme-refinput-border);
  }

  .text-input {
    overflow: auto;
    min-height: 2.75rem;
    padding: 0.125rem 0.75rem;
  }

  .buttons-panel {
    flex-shrink: 0;
    padding: 0.325rem 0.75rem;
  }
</style>
