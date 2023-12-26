<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Doc } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { KeyedAttribute } from '@hcengineering/presentation'
  import { registerFocus } from '@hcengineering/ui'
  import CollaborativeTextEditor from './CollaborativeTextEditor.svelte'
  import { FocusExtension } from './extension/focus'
  import { FileAttachFunction } from './extension/imageExt'
  import textEditorPlugin from '../plugin'
  import { minioDocumentId, mongodbDocumentId, platformDocumentId } from '../provider'
  import { RefAction, TextNodeAction } from '../types'

  export let object: Doc
  export let key: KeyedAttribute

  export let textNodeActions: TextNodeAction[] = []
  export let refActions: RefAction[] = []

  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let attachFile: FileAttachFunction | undefined = undefined
  export let boundary: HTMLElement | undefined = undefined

  export let focusIndex = -1

  let editor: CollaborativeTextEditor

  $: documentId = minioDocumentId(object._id, key)
  $: initialContentId = mongodbDocumentId(object._id, key)
  $: targetContentId = platformDocumentId(object._id, key)

  // Focusable control with index
  let canBlur = true
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable: boolean = editor?.isEditable() ?? false
      if (editable) {
        editor?.focus()
      }
      return editable
    },
    isFocus: () => editor.isFocused(),
    canBlur: () => {
      const focused: boolean = editor?.isFocused() ?? false
      if (focused) {
        return canBlur
      }
      return true
    }
  })
  const updateFocus = (): void => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }

  const handleFocus = (focused: boolean): void => {
    if (focused) {
      updateFocus()
    }
  }

  const extensions = [
    FocusExtension.configure({
      onCanBlur: (value: boolean) => (canBlur = value),
      onFocus: handleFocus
    })
  ]
</script>

<CollaborativeTextEditor
  bind:this={editor}
  {documentId}
  {initialContentId}
  {targetContentId}
  {textNodeActions}
  {refActions}
  {extensions}
  {attachFile}
  {placeholder}
  {boundary}
  field={key.key}
  on:focus
  on:blur
  on:update
/>
