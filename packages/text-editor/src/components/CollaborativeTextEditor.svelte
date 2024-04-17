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
  import { type Class, type CollaborativeDoc, type Doc, type Ref } from '@hcengineering/core'
  import { type DocumentId, type PlatformDocumentId } from '@hcengineering/collaborator-client'
  import { IntlString, getMetadata, translate } from '@hcengineering/platform'
  import { markupToJSON } from '@hcengineering/text'
  import presentation, { getFileUrl, getImageSize } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import {
    AnySvelteComponent,
    Button,
    IconSize,
    Loading,
    PopupAlignment,
    getEventPositionElement,
    getPopupPositionElement,
    ThrottledCaller,
    themeStore
  } from '@hcengineering/ui'
  import { AnyExtension, Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Placeholder from '@tiptap/extension-placeholder'
  import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte'
  import { Doc as YDoc } from 'yjs'

  import { deleteAttachment } from '../command/deleteAttachment'
  import { Completion } from '../Completion'
  import { textEditorCommandHandler } from '../commands'
  import { EditorKit } from '../kits/editor-kit'
  import textEditorPlugin from '../plugin'
  import { MinioProvider } from '../provider/minio'
  import { TiptapCollabProvider } from '../provider/tiptap'
  import { formatCollaborativeDocumentId, formatPlatformDocumentId } from '../provider/utils'
  import {
    CollaborationIds,
    CollaborationUser,
    RefAction,
    TextEditorCommandHandler,
    TextEditorHandler,
    TextFormatCategory,
    TextNodeAction
  } from '../types'
  import { addTableHandler } from '../utils'

  import CollaborationUsers from './CollaborationUsers.svelte'
  import ImageStyleToolbar from './ImageStyleToolbar.svelte'
  import TextEditorStyleToolbar from './TextEditorStyleToolbar.svelte'
  import { noSelectionRender, renderCursor } from './editor/collaboration'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { EmojiExtension } from './extension/emoji'
  import { ImageExtension } from './extension/imageExt'
  import { type FileAttachFunction } from './extension/types'
  import { FileExtension } from './extension/fileExt'
  import { LeftMenuExtension } from './extension/leftMenu'
  import { InlineCommandsExtension } from './extension/inlineCommands'
  import { InlinePopupExtension } from './extension/inlinePopup'
  import { InlineStyleToolbarExtension } from './extension/inlineStyleToolbar'
  import { completionConfig, inlineCommandsConfig } from './extensions'

  export let collaborativeDoc: CollaborativeDoc
  export let initialCollaborativeDoc: CollaborativeDoc | undefined = undefined
  export let field: string | undefined = undefined

  export let objectClass: Ref<Class<Doc>> | undefined
  export let objectId: Ref<Doc> | undefined
  export let objectAttr: string | undefined

  export let user: CollaborationUser
  export let userComponent: AnySvelteComponent | undefined = undefined

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
  export let canEmbedFiles = true
  export let canEmbedImages = true
  export let withSideMenu = true
  export let withInlineCommands = true

  const dispatch = createEventDispatcher()

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(textEditorPlugin.metadata.CollaboratorUrl) ?? ''

  const documentId = formatCollaborativeDocumentId(collaborativeDoc)

  let initialContentId: DocumentId | undefined
  if (initialCollaborativeDoc !== undefined) {
    initialContentId = formatCollaborativeDocumentId(collaborativeDoc)
  }

  let platformDocumentId: PlatformDocumentId | undefined
  if (objectClass !== undefined && objectId !== undefined && objectAttr !== undefined) {
    platformDocumentId = formatPlatformDocumentId(objectClass, objectId, objectAttr)
  }

  const ydoc = getContext<YDoc>(CollaborationIds.Doc) ?? new YDoc()
  const contextProvider = getContext<TiptapCollabProvider>(CollaborationIds.Provider)

  const localProvider = contextProvider === undefined ? new MinioProvider(documentId, ydoc) : undefined

  const remoteProvider: TiptapCollabProvider =
    contextProvider ??
    new TiptapCollabProvider({
      url: collaboratorURL,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId,
        platformDocumentId
      }
    })

  let localSynced = false
  let remoteSynced = false

  $: loading = !localSynced && !remoteSynced
  $: editable = !readonly && remoteSynced

  void localProvider?.loaded.then(() => (localSynced = true))
  void remoteProvider.loaded.then(() => (remoteSynced = true))

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
    insertMarkup: (markup) => {
      editor?.commands.insertContent(markupToJSON(markup))
    },
    insertTemplate: (name, markup) => {
      editor?.commands.insertContent(markupToJSON(markup))
    },
    insertTable: (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) => {
      editor?.commands.insertTable(options)
    },
    insertCodeBlock: () => {
      editor?.commands.insertContent(
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: ' ' }]
        },
        {
          updateSelection: false
        }
      )
    },
    insertContent: (content) => {
      editor?.commands.insertContent(content)
    },
    insertSeparatorLine: () => {
      editor?.commands.setHorizontalRule()
    },
    focus: () => {
      focus()
    }
  }

  function handleAction (a: RefAction, evt?: MouseEvent): void {
    a.action(evt?.target as HTMLElement, editorHandler, evt)
  }

  $: commandHandler = textEditorCommandHandler(editor)

  export function commands (): TextEditorCommandHandler | undefined {
    return commandHandler
  }

  export function removeAttachment (id: string): void {
    editor.commands.command(deleteAttachment(id))
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
    editor.setEditable(editable, true)
  }

  $: showTextStyleToolbar =
    ((editable && textFormatCategories.length > 0) || textNodeActions.length > 0) && canShowPopups

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
    if (canEmbedFiles) {
      optionalExtensions.push(
        FileExtension.configure({
          inline: true,
          attachFile
        })
      )
    }
    if (canEmbedImages) {
      optionalExtensions.push(
        ImageExtension.configure({
          inline: true,
          attachFile,
          uploadUrl: getMetadata(presentation.metadata.UploadURL)
        })
      )
    }
    if (withSideMenu) {
      optionalExtensions.push(
        LeftMenuExtension.configure({
          width: 20,
          height: 20,
          marginX: 8,
          className: 'tiptap-left-menu',
          icon: view.icon.Add,
          iconProps: {
            className: 'svg-tiny',
            fill: 'currentColor'
          },
          items: [
            ...(canEmbedImages ? [{ id: 'image', label: textEditorPlugin.string.Image, icon: view.icon.Image }] : []),
            { id: 'table', label: textEditorPlugin.string.Table, icon: view.icon.Table2 },
            { id: 'code-block', label: textEditorPlugin.string.CodeBlock, icon: view.icon.CodeBlock },
            { id: 'separator-line', label: textEditorPlugin.string.SeparatorLine, icon: view.icon.SeparatorLine }
          ],
          handleSelect: handleLeftMenuClick
        })
      )
    }
    if (withInlineCommands) {
      optionalExtensions.push(
        InlineCommandsExtension.configure(
          inlineCommandsConfig(handleLeftMenuClick, attachFile === undefined || !canEmbedImages ? ['image'] : [])
        )
      )
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

    editor.commands.insertContent(
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
    if (readonly) return
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

  async function handleLeftMenuClick (id: string, pos: number, targetItem?: MouseEvent | HTMLElement): Promise<void> {
    editor.commands.focus(pos, { scrollIntoView: false })

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

        // We need to trigger it asynchronously in order for the editor to finish its focus event
        // Otherwise, it hoggs the focus from the popup and keyboard navigation doesn't work
        setTimeout(() => {
          addTableHandler(editor.commands.insertTable, position)
        })
        break
      }
      case 'code-block':
        // For some reason .setCodeBlock doesnt work in our case
        editor.commands.insertContent(
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: ' ' }]
          },
          {
            updateSelection: false
          }
        )
        editor.commands.focus(pos, { scrollIntoView: false })
        break
      case 'separator-line':
        editor.commands.setHorizontalRule()
        break
    }
  }

  const throttle = new ThrottledCaller(100)
  const updateLastUpdateTime = (): void => {
    remoteProvider.awareness?.setLocalStateField('lastUpdate', Date.now())
  }

  onMount(async () => {
    await ph

    editor = new Editor({
      element,
      editorProps: { attributes: mergeAttributes(defaultEditorAttributes, editorAttributes, { class: 'flex-grow' }) },
      extensions: [
        EditorKit.configure({ history: false }),
        ...optionalExtensions,
        Placeholder.configure({ placeholder: placeHolderStr }),
        InlineStyleToolbarExtension.configure({
          tippyOptions,
          element: textToolbarElement,
          isSupported: () => showTextStyleToolbar
        }),
        InlinePopupExtension.configure({
          pluginKey: 'show-image-actions-popup',
          element: imageToolbarElement,
          tippyOptions: {
            ...tippyOptions,
            appendTo: () => boundary ?? element
          },
          shouldShow: ({ editor }) => {
            if (!editable || !canShowPopups) {
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
          provider: remoteProvider,
          user,
          render: renderCursor,
          selectionRender: noSelectionRender
        }),
        Completion.configure({
          ...completionConfig,
          showDoc (event: MouseEvent, _id: string, _class: string) {
            dispatch('open-document', { event, _id, _class })
          }
        }),
        EmojiExtension,
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

        throttle.call(updateLastUpdateTime)
        dispatch('update')
      }
    })
  })

  onDestroy(() => {
    if (editor !== undefined) {
      try {
        editor.destroy()
      } catch (err: any) {}
    }
    if (contextProvider === undefined) {
      remoteProvider.destroy()
    }
    localProvider?.destroy()
  })
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

  <div
    class="text-editor-toolbar buttons-group xsmall-gap mb-4"
    bind:this={textToolbarElement}
    style="visibility: hidden;"
  >
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

  <div
    class="text-editor-toolbar buttons-group xsmall-gap mb-4"
    bind:this={imageToolbarElement}
    style="visibility: hidden;"
  >
    <ImageStyleToolbar textEditor={editor} formatButtonSize={buttonSize} on:focus={handleFocus} />
  </div>

  <div class="textInput">
    <div class="select-text" class:hidden={loading} style="width: 100%;" bind:this={element} />
    {#if remoteProvider && editor && userComponent}
      <CollaborationUsers provider={remoteProvider} {editor} component={userComponent} />
    {/if}
  </div>

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

  .textInput {
    flex-grow: 1;
    gap: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    min-height: 1.25rem;
    background-color: transparent;

    :global(.tiptap-left-menu) {
      color: var(--theme-trans-color);
      width: 20px;
      height: 20px;
      border-radius: 20%;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background-color: var(--theme-button-hovered);
        cursor: pointer;
      }

      &:active {
        background-color: var(--theme-button-pressed);
      }
    }
  }

  .hidden {
    display: none;
  }
</style>
