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
  import { IntlString } from '@hcengineering/platform'
  import { IconSize, registerFocus } from '@hcengineering/ui'
  import { AnyExtension, Editor, FocusPosition, getMarkRange } from '@tiptap/core'
  import { TextSelection } from '@tiptap/pm/state'

  import textEditorPlugin from '../plugin'
  import { DocumentId } from '../provider'
  import { TextEditorCommandHandler, TextNodeAction } from '../types'

  import CollaborativeTextEditor from './CollaborativeTextEditor.svelte'
  import { FileAttachFunction } from './extension/imageExt'
  import { NodeUuidExtension, nodeElementQuerySelector } from './extension/nodeUuid'

  export let documentId: DocumentId
  export let field: string | undefined = undefined
  export let initialContentId: DocumentId | undefined = undefined
  export let targetContentId: DocumentId | undefined = undefined

  export let readonly = false

  export let buttonSize: IconSize = 'small'
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder

  export let overflow: 'auto' | 'none' = 'auto'
  export let textNodeActions: TextNodeAction[] = []
  export let editorAttributes: Record<string, string> = {}
  export let onExtensions: () => AnyExtension[] = () => []
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined
  export let canShowPopups = true

  let element: HTMLElement

  let editor: Editor | undefined
  let collaborativeEditor: CollaborativeTextEditor

  export function commands (): TextEditorCommandHandler | undefined {
    return collaborativeEditor?.commands()
  }

  export function takeSnapshot (snapshotId: string): void {
    collaborativeEditor?.takeSnapshot(snapshotId)
  }

  export function copyField (srcFieldId: string, dstFieldId: string): void {
    collaborativeEditor?.copyField(srcFieldId, dstFieldId)
  }

  // TODO Not collaborative
  export function getNodeElement (uuid: string): Element | null {
    if (editor === undefined || uuid === '') {
      return null
    }

    return editor.view.dom.querySelector(nodeElementQuerySelector(uuid))
  }

  // TODO Not collaborative
  export function selectNode (uuid: string): void {
    if (editor === undefined) {
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

      if (nodeUuidMark === undefined) {
        return
      }

      foundNode = true

      // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
      const range = getMarkRange(doc.resolve(pos + 1), schema.marks[NodeUuidExtension.name])

      if (range === undefined) {
        return false
      }

      const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]
      editor?.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
      focus()
    })
  }

  // TODO Not collaborative
  export function selectRange (from: number, to: number): void {
    if (editor === undefined) {
      return
    }

    const { doc, tr } = editor.view.state
    const [$start, $end] = [doc.resolve(from), doc.resolve(to)]
    editor.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
    focus()
  }

  // TODO Not collaborative
  export function setNodeUuid (nodeId: string): boolean {
    if (editor === undefined || editor.view.state.selection.empty || nodeId === '') {
      return false
    }

    return editor.chain().setNodeUuid(nodeId).run()
  }

  export function focus (position?: FocusPosition): void {
    collaborativeEditor?.focus(position)
  }

  export function isFocused (): boolean {
    return collaborativeEditor?.isFocused() ?? false
  }

  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      focus()
      return element !== null
    },
    isFocus: () => isFocused(),
    canBlur: () => false
  })
  const updateFocus = (): void => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }

  function handleFocus (): void {
    updateFocus()
  }
</script>

<div class="root">
  <CollaborativeTextEditor
    bind:this={collaborativeEditor}
    {documentId}
    {field}
    {initialContentId}
    {targetContentId}
    {readonly}
    {buttonSize}
    {placeholder}
    {overflow}
    {boundary}
    {attachFile}
    extensions={[...onExtensions()]}
    {textNodeActions}
    {canShowPopups}
    {editorAttributes}
    on:update
    on:open-document
    on:blur
    on:focus={handleFocus}
    on:editor={(evt) => {
      editor = evt.detail
    }}
  />
</div>

<style lang="scss">
  .root {
    font-size: 0.9375rem;
  }
</style>
