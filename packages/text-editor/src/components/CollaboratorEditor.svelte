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
  import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
  import { DecorationSet } from 'prosemirror-view'
  import { getContext, createEventDispatcher, onDestroy, onMount } from 'svelte'
  import * as Y from 'yjs'
  import {
    AnyExtension,
    Editor,
    Extension,
    FocusPosition,
    HTMLContent,
    getMarkRange,
    mergeAttributes
  } from '@tiptap/core'
  import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Placeholder from '@tiptap/extension-placeholder'
  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { getPlatformColorForText, IconObjects, IconSize, Loading, registerFocus, themeStore } from '@hcengineering/ui'

  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { TiptapCollabProvider } from '../provider'
  import { CollaborationIds, TextFormatCategory, TextNodeAction } from '../types'
  import { copyDocumentContent, copyDocumentField } from '../utils'

  import { calculateDecorations } from './diff/decorations'
  import { noSelectionRender } from './editor/collaboration'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { completionConfig, defaultExtensions } from './extensions'
  import { InlinePopupExtension } from './extension/inlinePopup'
  import { InlineStyleToolbarExtension } from './extension/inlineStyleToolbar'
  import { FileAttachFunction, ImageExtension } from './extension/imageExt'
  import { NodeUuidExtension, nodeElementQuerySelector } from './extension/nodeUuid'
  import ImageStyleToolbar from './ImageStyleToolbar.svelte'
  import StyleButton from './StyleButton.svelte'
  import TextEditorStyleToolbar from './TextEditorStyleToolbar.svelte'

  export let documentId: string
  export let readonly = false
  export let visible = true

  export let token: string
  export let collaboratorURL: string

  export let buttonSize: IconSize = 'small'
  export let focusable: boolean = false
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let initialContentId: string | undefined = undefined
  export let comparedVersion: Markup | ArrayBuffer | undefined = undefined

  export let field: string | undefined = undefined

  export let overflow: 'auto' | 'none' = 'auto'
  export let initialContent: string | undefined = undefined
  export let textNodeActions: TextNodeAction[] = []
  export let editorAttributes: { [name: string]: string } = {}
  export let onExtensions: () => AnyExtension[] = () => []
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined

  let element: HTMLElement

  const ydoc = (getContext(CollaborationIds.Doc) as Y.Doc | undefined) ?? new Y.Doc()

  const contextProvider = getContext(CollaborationIds.Provider) as TiptapCollabProvider | undefined

  const provider =
    contextProvider ??
    new TiptapCollabProvider({
      url: collaboratorURL,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId: initialContentId ?? ''
      }
    })

  let loading = true

  if (contextProvider === undefined) {
    provider?.on('synced', () => {
      loading = false
    })
  } else {
    loading = false
  }

  const currentUser = getCurrentAccount()

  let editor: Editor
  let textToolbarElement: HTMLElement
  let imageToolbarElement: HTMLElement

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function getHTML (): string | undefined {
    if (editor) {
      return editor.getHTML()
    }
  }

  export function getNodeElement (uuid: string): Element | null {
    if (!editor || !uuid) {
      return null
    }

    return editor.view.dom.querySelector(nodeElementQuerySelector(uuid))
  }

  export function selectNode (uuid: string) {
    if (!editor) {
      return
    }

    const { doc, schema, tr } = editor.view.state
    let foundNode = false
    doc.descendants((node, pos) => {
      if (foundNode) {
        return false
      }

      const nodeUuidMark = node.marks.find(
        (mark) => mark.type.name === NodeUuidExtension.name && mark.attrs[NodeUuidExtension.name] === uuid
      )

      if (!nodeUuidMark) {
        return
      }

      foundNode = true

      // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
      const range = getMarkRange(doc.resolve(pos + 1), schema.marks[NodeUuidExtension.name])

      if (!range) {
        return false
      }

      const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]
      editor.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
      needFocus = true
    })
  }

  export function takeSnapshot (snapshotId: string) {
    copyDocumentContent(documentId, snapshotId, { provider }, initialContentId)
  }

  export function copyField (srcFieldId: string, dstFieldId: string) {
    copyDocumentField(documentId, srcFieldId, dstFieldId, { provider }, initialContentId)
  }

  export function unregisterPlugin (nameOrPluginKey: string | PluginKey) {
    if (!editor) {
      return
    }

    editor.unregisterPlugin(nameOrPluginKey)
  }

  export function registerPlugin (plugin: Plugin) {
    if (!editor) {
      return
    }

    editor.registerPlugin(plugin)
  }

  let needFocus = false
  let focused = false
  let posFocus: FocusPosition | undefined = undefined

  export function focus (position?: FocusPosition): void {
    posFocus = position
    needFocus = true
  }

  $: if (editor && needFocus) {
    if (!focused) {
      editor.commands.focus(posFocus)
      posFocus = undefined
    }
    needFocus = false
  }

  $: if (editor !== undefined) {
    editor.setEditable(!readonly)
  }

  let _decoration = DecorationSet.empty
  let oldContent = ''

  function updateEditor (editor?: Editor, field?: string, comparedVersion?: Markup | ArrayBuffer): void {
    const r = calculateDecorations(editor, oldContent, field, comparedVersion)
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = () => {
    if (editor && editor.schema) {
      updateEditor(editor, field, comparedVersion)
    }
  }

  const DecorationExtension = Extension.create({
    addProseMirrorPlugins () {
      return [
        new Plugin({
          key: new PluginKey('diffs'),
          props: {
            decorations (state) {
              updateDecorations()
              if (showDiff) {
                return _decoration
              }
              return undefined
            }
          }
        })
      ]
    }
  })

  $: updateEditor(editor, field, comparedVersion)
  $: if (editor) dispatch('editor', editor)

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
    ph.then(() => {
      editor = new Editor({
        element,
        editable: true,
        editorProps: { attributes: mergeAttributes(defaultEditorAttributes, editorAttributes, { class: 'flex-grow' }) },
        extensions: [
          ...defaultExtensions,
          ...optionalExtensions,
          Placeholder.configure({ placeholder: placeHolderStr }),
          InlineStyleToolbarExtension.configure({
            tippyOptions,
            element: textToolbarElement,
            isSupported: () => !readonly,
            isSelectionOnly: () => false
          }),
          InlinePopupExtension.configure({
            pluginKey: 'show-image-actions-popup',
            element: imageToolbarElement,
            tippyOptions: {
              ...tippyOptions,
              appendTo: () => boundary ?? element
            },
            shouldShow: () => {
              if (!visible && !readonly) {
                return false
              }
              return editor?.isActive('image')
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
          DecorationExtension,
          Completion.configure({
            ...completionConfig,
            showDoc (event: MouseEvent, _id: string, _class: string) {
              dispatch('open-document', { event, _id, _class })
            }
          }),
          ...onExtensions()
        ],
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
          updateFocus()
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

      if (initialContent) {
        editor.commands.insertContent(initialContent as HTMLContent)
      }
    })
  })

  onDestroy(() => {
    if (editor) {
      try {
        editor.destroy()
      } catch (err: any) {}
      if (contextProvider === undefined) {
        provider.destroy()
      }
    }
  })

  let showDiff = true

  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      if (visible) {
        focus()
      }
      return visible && element !== null
    },
    isFocus: () => document.activeElement === element,
    canBlur: () => false
  })
  const updateFocus = () => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }
  $: if (element) {
    element.addEventListener('focus', updateFocus, { once: true })
  }

  function handleFocus () {
    needFocus = true
  }
</script>

<slot {editor} />

{#if loading}
  <div class="flex p-3">
    <Loading />
  </div>
{/if}

{#if visible}
  {#if comparedVersion !== undefined || $$slots.tools}
    <div class="ref-container" style:overflow>
      {#if comparedVersion !== undefined}
        <div class="flex-row-center buttons-group xsmall-gap">
          <StyleButton
            icon={IconObjects}
            size={buttonSize}
            selected={showDiff}
            showTooltip={{ label: textEditorPlugin.string.EnableDiffMode }}
            on:click={() => {
              showDiff = !showDiff
              editor.chain().focus()
            }}
          />
          <slot name="tools" />
        </div>
      {:else}
        <div class="text-editor-toolbar buttons-group xsmall-gap">
          <slot name="tools" />
        </div>
      {/if}
    </div>
  {/if}

  <div
    class="text-editor-toolbar buttons-group xsmall-gap mb-4"
    bind:this={textToolbarElement}
    style="visibility: hidden;"
  >
    <TextEditorStyleToolbar
      textEditor={editor}
      textFormatCategories={[
        TextFormatCategory.Heading,
        TextFormatCategory.TextDecoration,
        TextFormatCategory.Link,
        TextFormatCategory.List,
        TextFormatCategory.Quote,
        TextFormatCategory.Code,
        TextFormatCategory.Table
      ]}
      formatButtonSize={buttonSize}
      {textNodeActions}
      on:focus={() => {
        needFocus = true
      }}
      on:action={(event) => {
        dispatch('action', event.detail)
        needFocus = true
      }}
    />
  </div>

  <div
    class="text-editor-toolbar buttons-group xsmall-gap mb-4"
    bind:this={imageToolbarElement}
    style="visibility: hidden;"
  >
    <ImageStyleToolbar textEditor={editor} formatButtonSize={buttonSize} on:focus={handleFocus} />
  </div>

  <div class="text-input" style:overflow class:focusable class:hidden={loading}>
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
{/if}

<style lang="scss">
  .ref-container .text-editor-toolbar {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);
    z-index: 1;
  }

  .ref-container:focus-within .text-editor-toolbar {
    position: sticky;
    top: 1.25rem;
  }

  .text-editor-toolbar {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    z-index: 1;
  }

  .text-input {
    font-size: 0.9375rem;
  }

  .hidden {
    display: none;
  }
</style>
