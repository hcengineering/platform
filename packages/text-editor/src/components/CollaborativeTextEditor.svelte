<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { getCurrentAccount } from '@hcengineering/core'
  import { IntlString, getMetadata, translate } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Button, IconSize, Loading, getPlatformColorForText, themeStore } from '@hcengineering/ui'
  import { AnyExtension, Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Placeholder from '@tiptap/extension-placeholder'
  import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte'
  import { Doc as YDoc } from 'yjs'

  import { Completion } from '../Completion'
  import { textEditorCommandHandler } from '../commands'
  import textEditorPlugin from '../plugin'
  import { DocumentId, TiptapCollabProvider } from '../provider'
  import {
    CollaborationIds,
    RefAction,
    TextEditorCommandHandler,
    TextEditorHandler,
    TextFormatCategory,
    TextNodeAction
  } from '../types'
  import { copyDocumentContent, copyDocumentField } from '../utils'

  import ImageStyleToolbar from './ImageStyleToolbar.svelte'
  import TextEditorStyleToolbar from './TextEditorStyleToolbar.svelte'
  import { noSelectionRender } from './editor/collaboration'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { EmojiExtension } from './extension/emoji'
  import { FileAttachFunction, ImageExtension } from './extension/imageExt'
  import { InlinePopupExtension } from './extension/inlinePopup'
  import { InlineStyleToolbarExtension } from './extension/inlineStyleToolbar'
  import { completionConfig, defaultExtensions } from './extensions'

  export let documentId: DocumentId
  export let field: string | undefined = undefined
  export let initialContentId: DocumentId | undefined = undefined
  export let targetContentId: DocumentId | undefined = undefined

  export let readonly = false

  export let buttonSize: IconSize = 'small'
  export let actionsButtonSize: IconSize = 'medium'
  export let full: boolean = false
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let extensions: AnyExtension[] = []
  export let textFormatCategories: TextFormatCategory[] = [
    TextFormatCategory.Heading,
    TextFormatCategory.TextDecoration,
    TextFormatCategory.Link,
    TextFormatCategory.List,
    TextFormatCategory.Quote,
    TextFormatCategory.Code,
    TextFormatCategory.Table
  ]
  export let textNodeActions: TextNodeAction[] = []
  export let refActions: RefAction[] = []

  export let editorAttributes: Record<string, string> = {}
  export let overflow: 'auto' | 'none' = 'none'
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined
  export let canShowPopups = true

  const dispatch = createEventDispatcher()

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(textEditorPlugin.metadata.CollaboratorUrl) ?? ''

  const ydoc = getContext<YDoc>(CollaborationIds.Doc) ?? new YDoc()
  const contextProvider = getContext<TiptapCollabProvider>(CollaborationIds.Provider)

  const provider: TiptapCollabProvider =
    contextProvider ??
    new TiptapCollabProvider({
      url: collaboratorURL,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId,
        targetContentId
      }
    })

  let loading = true
  void provider.loaded.then(() => (loading = false))

  const currentUser = getCurrentAccount()

  let editor: Editor
  let element: HTMLElement
  let textToolbarElement: HTMLElement
  let imageToolbarElement: HTMLElement

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    placeHolderStr = r
  })

  $: dispatch('editor', editor)

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.commands.insertContent(text)
    },
    insertTemplate: (name, text) => {
      editor?.commands.insertContent(text)
    },
    focus: () => {
      focus()
    }
  }

  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  $: commandHandler = textEditorCommandHandler(editor)

  export function commands (): TextEditorCommandHandler | undefined {
    return commandHandler
  }

  export function takeSnapshot (snapshotId: string): void {
    copyDocumentContent(documentId, snapshotId, { provider }, initialContentId)
  }

  export function copyField (srcFieldId: string, dstFieldId: string): void {
    copyDocumentField(documentId, srcFieldId, dstFieldId, { provider }, initialContentId)
  }

  export function isEditable (): boolean {
    return editor?.isEditable ?? false
  }

  let needFocus = false
  let focused = false
  let posFocus: FocusPosition | undefined = undefined

  export function focus (position?: FocusPosition): void {
    posFocus = position
    needFocus = true
  }

  export function isFocused (): boolean {
    return focused
  }

  $: if (editor !== undefined && needFocus) {
    if (!focused) {
      editor.commands.focus(posFocus)
      posFocus = undefined
    }
    needFocus = false
  }

  function handleFocus (): void {
    needFocus = true
  }

  $: if (editor !== undefined) {
    editor.setEditable(!readonly)
  }

  $: showTextStyleToolbar =
    (!readonly || textFormatCategories.length > 0 || textNodeActions.length > 0) && canShowPopups

  $: tippyOptions = {
    zIndex: 100000,
    popperOptions: {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            boundary,
            padding: 8,
            altAxis: true,
            tether: false
          }
        }
      ]
    }
  }

  const optionalExtensions: AnyExtension[] = []

  if (attachFile !== undefined) {
    optionalExtensions.push(
      ImageExtension.configure({
        inline: true,
        attachFile
      })
    )
  }

  onMount(() => {
    void ph.then(() => {
      editor = new Editor({
        element,
        editorProps: { attributes: mergeAttributes(defaultEditorAttributes, editorAttributes, { class: 'flex-grow' }) },
        extensions: [
          ...defaultExtensions,
          ...optionalExtensions,
          Placeholder.configure({ placeholder: placeHolderStr }),
          InlineStyleToolbarExtension.configure({
            tippyOptions,
            element: textToolbarElement,
            isSupported: () => showTextStyleToolbar,
            isSelectionOnly: () => false
          }),
          InlinePopupExtension.configure({
            pluginKey: 'show-image-actions-popup',
            element: imageToolbarElement,
            tippyOptions: {
              ...tippyOptions,
              appendTo: () => boundary ?? element
            },
            shouldShow: ({ editor }) => {
              if (readonly || !canShowPopups) {
                return false
              }
              return editor.isActive('image')
            }
          }),
          Collaboration.configure({
            document: ydoc,
            field
          }),
          CollaborationCursor.configure({
            provider,
            user: {
              name: currentUser.email,
              color: getPlatformColorForText(currentUser.email, $themeStore.dark)
            },
            selectionRender: noSelectionRender
          }),
          Completion.configure({
            ...completionConfig,
            showDoc (event: MouseEvent, _id: string, _class: string) {
              dispatch('open-document', { event, _id, _class })
            }
          }),
          EmojiExtension.configure(),
          ...extensions
        ],
        parseOptions: {
          preserveWhitespace: 'full'
        },
        onTransaction: () => {
          // force re-render so `editor.isActive` works as expected
          editor = editor
        },
        onBlur: ({ event }) => {
          focused = false
          dispatch('blur', event)
        },
        onFocus: () => {
          focused = true
          dispatch('focus')
        },
        onUpdate: ({ transaction }) => {
          // ignore non-document changes
          if (!transaction.docChanged) return
          // ignore non-local changes
          if (isChangeOrigin(transaction)) return

          dispatch('update')
        }
      })
    })
  })

  onDestroy(() => {
    if (editor !== undefined) {
      try {
        editor.destroy()
      } catch (err: any) {}
      if (contextProvider === undefined) {
        provider.destroy()
      }
    }
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  style:overflow
  class="ref-container clear-mins"
  class:h-full={full}
  on:click|preventDefault|stopPropagation={() => (needFocus = true)}
>
  {#if loading}
    <div class="flex p-3">
      <Loading />
    </div>
  {/if}

  <div class="text-editor-toolbar buttons-group xsmall-gap mb-4" bind:this={textToolbarElement}>
    {#if showTextStyleToolbar}
      <TextEditorStyleToolbar
        textEditor={editor}
        formatButtonSize={buttonSize}
        {textFormatCategories}
        {textNodeActions}
        on:focus={handleFocus}
      />
    {/if}
  </div>

  <div class="text-editor-toolbar buttons-group xsmall-gap mb-4" bind:this={imageToolbarElement}>
    <ImageStyleToolbar textEditor={editor} formatButtonSize={buttonSize} on:focus={handleFocus} />
  </div>

  <div class="select-text" class:hidden={loading} style="width: 100%;" bind:this={element} />

  {#if refActions.length > 0}
    <div class="buttons-panel flex-between clear-mins">
      <div class="buttons-group xsmall-gap mt-3">
        {#each refActions as a}
          <Button
            disabled={a.disabled}
            icon={a.icon}
            iconProps={{ size: actionsButtonSize }}
            kind="ghost"
            showTooltip={{ label: a.label }}
            size="medium"
            on:click={(evt) => {
              handleAction(a, evt)
            }}
          />
          {#if a.order % 10 === 1}
            <div class="buttons-divider" />
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .text-editor-toolbar {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);
    z-index: 1;
  }

  .hidden {
    display: none;
  }
</style>
