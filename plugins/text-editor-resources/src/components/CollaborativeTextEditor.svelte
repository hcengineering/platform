<!--
//
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { Analytics } from '@hcengineering/analytics'
  import {
    AccountRole,
    type Blob,
    Class,
    type CollaborativeDoc,
    type Doc,
    generateId,
    getCurrentAccount,
    hasAccountRole,
    makeDocCollabId,
    type Ref
  } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import {
    DrawingCmd,
    getAttribute,
    getClient,
    getFileUrl,
    getImageSize,
    imageSizeToRatio,
    KeyedAttribute
  } from '@hcengineering/presentation'
  import { markupToJSON } from '@hcengineering/text'
  import {
    AnySvelteComponent,
    Button,
    getEventPositionElement,
    getPopupPositionElement,
    IconScribble,
    IconSize,
    Loading,
    PopupAlignment,
    themeStore,
    ThrottledCaller
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import { isChangeOrigin } from '@tiptap/extension-collaboration'
  import { createEventDispatcher, getContext, onDestroy, onMount } from 'svelte'
  import { Doc as YDoc } from 'yjs'

  import textEditor, {
    CollaborationIds,
    CollaborationUser,
    RefAction,
    TextEditorCommandHandler,
    TextEditorHandler
  } from '@hcengineering/text-editor'
  import { EditorKitOptions, getEditorKit } from '../../src/kits/editor-kit'
  import { deleteAttachment } from '../command/deleteAttachment'
  import { textEditorCommandHandler } from '../commands'
  import { Provider } from '../provider/types'
  import { createLocalProvider, createRemoteProvider } from '../provider/utils'
  import { addTableHandler } from '../utils'

  import { noSelectionRender, renderCursor } from './editor/collaboration'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { SavedBoard } from './extension/drawingBoard'
  import { type FileAttachFunction } from './extension/types'
  import { inlineCommandsConfig } from './extensions'

  export let object: Doc
  export let attribute: KeyedAttribute

  export let user: CollaborationUser
  export let userComponent: AnySvelteComponent | undefined = undefined

  export let readonly = false

  export let buttonSize: IconSize = 'small'
  export let actionsButtonSize: IconSize = 'medium'
  export let full: boolean = false
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder

  export let refActions: RefAction[] = []

  export let editorAttributes: Record<string, string> = {}
  export let overflow: 'auto' | 'none' = 'none'
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined

  export let withSideMenu = true
  export let withInlineCommands = true

  export let kitOptions: Partial<EditorKitOptions> = {}

  export let requestSideSpace: ((width: number) => void) | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const account = getCurrentAccount()
  $: isGuest = account.role === AccountRole.DocGuest || account.role === AccountRole.ReadOnlyGuest

  const objectClass = object._class
  const objectId = object._id
  const objectSpace = object.space
  const objectAttr = attribute.key
  const field = attribute.key
  const content = getAttribute(client, object, attribute)
  const collaborativeDoc = makeDocCollabId(object, objectAttr)

  const ydoc = getContext<YDoc>(CollaborationIds.Doc) ?? new YDoc({ guid: generateId(), gc: false })
  const contextProvider = getContext<Provider>(CollaborationIds.Provider)

  const localProvider = createLocalProvider(ydoc, collaborativeDoc)
  const remoteProvider = contextProvider ?? createRemoteProvider(ydoc, collaborativeDoc, content)

  let contentError = false
  let localSynced = false
  let remoteSynced = false

  $: loading = !localSynced && !remoteSynced
  $: editable = !readonly && !contentError && remoteSynced && hasAccountRole(account, AccountRole.User)

  void localProvider.loaded.then(() => (localSynced = true))
  void remoteProvider.loaded.then(() => (remoteSynced = true))

  void Promise.all([localProvider.loaded, remoteProvider.loaded]).then(() => {
    dispatch('loaded')
  })

  let editor: Editor
  let element: HTMLElement
  let editorPopupContainer: HTMLElement

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    if (editor !== undefined && placeHolderStr !== r) {
      const placeholderIndex = editor.extensionManager.extensions.findIndex(
        (extension) => extension.name === 'placeholder'
      )
      if (placeholderIndex !== -1) {
        editor.extensionManager.extensions[placeholderIndex].options.placeholder = r
        editor.view.dispatch(editor.state.tr)
      }
    }
    placeHolderStr = r
  })

  $: dispatch('editor', editor)

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.commands.insertContent(text)
    },
    insertEmoji: (text: string, image?: Ref<Blob>) => {
      editor?.commands.insertEmoji(text, image === undefined ? 'unicode' : 'image', image)
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
      editor?.commands.setCodeBlock()
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

  $: if (editor !== undefined) {
    // When the content is invalid, we don't want to emit an update
    // Preventing synchronization of the invalid content
    const emitUpdate = !contentError
    editor.setEditable(editable, emitUpdate)
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

    const size = await getImageSize(file)

    editor.commands.insertContent(
      {
        type: 'image',
        attrs: {
          'file-id': attached.file,
          width: imageSizeToRatio(size.width, size.pixelRatio)
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
          // addTableHandler opens popup so the editor loses focus so in the callback we need to refocus again
          void addTableHandler((options: { rows?: number, cols?: number, withHeaderRow?: boolean }) => {
            editor.chain().focus(pos).insertTable(options).run()
          }, position)
        }, 0)
        break
      }
      case 'code-block':
        editor.commands.insertContentAt(pos, { type: 'codeBlock' })
        break
      case 'todo-list':
        editor.chain().insertContentAt(pos, { type: 'paragraph' }).toggleTaskList().run()
        break
      case 'separator-line':
        editor.commands.setHorizontalRule()
        break
      case 'drawing-board':
        editor.commands.insertContentAt(pos, { type: 'drawingBoard', attrs: { id: generateId() } })
        break
      case 'mermaid':
        editor.commands.insertContentAt(pos, { type: 'mermaid' })
        break
    }
  }

  const throttle = new ThrottledCaller(100)
  const updateLastUpdateTime = (): void => {
    remoteProvider.awareness?.setLocalStateField('lastUpdate', Date.now())
  }

  interface SavedBoardRaw {
    ydoc: YDoc
    localProvider: Provider
    remoteProvider: Provider
    localSynced: boolean
    remoteSynced: boolean
  }
  const savedBoards: Record<string, SavedBoardRaw> = {}

  function getSavedBoard (id: string): SavedBoard {
    let board = savedBoards[id]
    if (board === undefined) {
      const ydoc = new YDoc({ guid: id, gc: false })
      // We don't have a real class for boards,
      // but collaborator only needs a string id
      // which is produced from such an id-object
      const collabId: CollaborativeDoc = {
        objectClass: 'DrawingBoard' as Ref<Class<Doc>>,
        objectId: id as Ref<Doc>,
        objectAttr: 'content'
      }
      const localProvider = createLocalProvider(ydoc, collabId)
      const remoteProvider = createRemoteProvider(ydoc, collabId, id as Ref<Blob>)
      savedBoards[id] = { ydoc, localProvider, remoteProvider, localSynced: false, remoteSynced: false }
      void localProvider.loaded.then(() => (savedBoards[id].localSynced = true))
      void remoteProvider.loaded.then(() => (savedBoards[id].remoteSynced = true))
      board = savedBoards[id]
    }
    return {
      document: board.ydoc,
      props: board.ydoc.getMap('props'),
      commands: board.ydoc.getArray<DrawingCmd>('commands'),
      loading: !board.localSynced || !board.remoteSynced
    }
  }

  onMount(async () => {
    await ph

    // it is recommended to wait for the local provider to be loaded
    // https://discuss.yjs.dev/t/initial-offline-value-of-a-shared-document/465/4
    await localProvider.loaded

    const canAttachFiles = attachFile != null

    const kit = await getEditorKit(
      {
        objectId,
        objectClass,
        objectSpace,

        history: false,
        shortcuts: {
          submit: false,
          imageUpload: canAttachFiles && { attachFile, getFileUrl },
          fileUpload: canAttachFiles && { attachFile }
        },
        toolbar: {
          boundary,
          popupContainer: editorPopupContainer
        },
        codeSnippets: {
          codeBlockMermaid: { ydoc, ydocContentField: field }
        },
        drawingBoard: { getSavedBoard },
        leftMenu: withSideMenu && {
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
            { id: 'image', label: textEditor.string.Image, icon: view.icon.Image },
            { id: 'table', label: textEditor.string.Table, icon: view.icon.Table2 },
            { id: 'code-block', label: textEditor.string.CodeBlock, icon: view.icon.CodeBlock },
            { id: 'separator-line', label: textEditor.string.SeparatorLine, icon: view.icon.SeparatorLine },
            { id: 'todo-list', label: textEditor.string.TodoItem, icon: view.icon.TodoList },
            { id: 'drawing-board', label: textEditor.string.DrawingBoard, icon: IconScribble as any },
            { id: 'mermaid', label: textEditor.string.MermaidDiargram, icon: view.icon.Model }
          ],
          handleSelect: handleLeftMenuClick
        },
        inlineCommands:
          withInlineCommands && inlineCommandsConfig(handleLeftMenuClick, canAttachFiles ? [] : ['image']),
        placeholder: { placeholder: placeHolderStr },
        collaboration: {
          collaboration: { document: ydoc, field },
          collaborationCursor: {
            provider: remoteProvider,
            user,
            render: renderCursor,
            selectionRender: noSelectionRender
          },
          inlineComments: !isGuest && {
            ydoc,
            boundary,
            popupContainer: editorPopupContainer,
            requestSideSpace
          }
        }
      },
      kitOptions
    )

    editor = new Editor({
      extensions: [kit],
      element,
      editorProps: {
        attributes: mergeAttributes(defaultEditorAttributes, editorAttributes, { class: 'flex-grow' })
      },
      enableContentCheck: true,
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
      },
      onContentError: ({ error, disableCollaboration }) => {
        disableCollaboration()
        contentError = true
        Analytics.handleError(error)
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
      void remoteProvider.destroy()
    }
    void localProvider.destroy()
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
<div class="editorPopupContainer" bind:this={editorPopupContainer}></div>
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

  <div class="textInput">
    <div class="select-text" class:hidden={loading} style="width: 100%;" bind:this={element} />
    <!-- <div class="collaborationUsers-container flex-col flex-gap-2 pt-2">
      {#if remoteProvider && editor && userComponent}
        <CollaborationUsers provider={remoteProvider} {editor} component={userComponent} />
      {/if}
    </div> -->
  </div>

  {#if refActions.length > 0}
    <div class="buttons-panel flex-between clear-mins no-print">
      <div class="buttons-group xsmall-gap mt-3">
        {#each refActions as a, idx (a)}
          {#if idx !== 0 && a.order % 10 === 0}
            <div class="buttons-divider" />
          {/if}

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
    position: relative;
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
  .collaborationUsers-container {
    position: sticky;
    top: 0;
    min-width: 1.5rem;
  }

  .hidden {
    display: none;
  }
</style>
