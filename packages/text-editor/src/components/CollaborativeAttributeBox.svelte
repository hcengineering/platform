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
  import core, { CollaborativeDoc, Doc, getCollaborativeDoc, getCollaborativeDocId } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { KeyedAttribute, getAttribute, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, registerFocus } from '@hcengineering/ui'
  import CollaborativeTextEditor from './CollaborativeTextEditor.svelte'
  import { FocusExtension } from './extension/focus'
  import { type FileAttachFunction } from './extension/types'
  import textEditorPlugin from '../plugin'
  import { CollaborationUser, RefAction, TextNodeAction } from '../types'

  export let object: Doc
  export let key: KeyedAttribute
  export let readonly = false
  export let textNodeActions: TextNodeAction[] = []
  export let refActions: RefAction[] = []

  export let user: CollaborationUser
  export let userComponent: AnySvelteComponent | undefined = undefined

  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let attachFile: FileAttachFunction | undefined = undefined
  export let boundary: HTMLElement | undefined = undefined

  export let focusIndex = -1

  export function isFocused (): boolean {
    return editor?.isFocused() ?? false
  }

  export function removeAttachment (id: string): void {
    return editor?.removeAttachment(id)
  }

  let editor: CollaborativeTextEditor

  $: collaborativeDoc = getCollaborativeDocFromAttribute(object, key)

  function getCollaborativeDocFromAttribute (object: Doc, key: KeyedAttribute): CollaborativeDoc {
    const value = getAttribute(getClient(), object, key)
    if (key.attr.type._class === core.class.TypeCollaborativeDoc) {
      return value as CollaborativeDoc
    } else if (key.attr.type._class === core.class.TypeCollaborativeDocVersion) {
      return value as CollaborativeDoc
    } else {
      // TODO Remove this when we migrate to minio
      const collaborativeDocId = getCollaborativeDocId(object._id, key.key)
      return getCollaborativeDoc(collaborativeDocId)
    }
  }

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
  {collaborativeDoc}
  objectClass={object._class}
  objectId={object._id}
  objectAttr={key.key}
  {user}
  {userComponent}
  {textNodeActions}
  {refActions}
  {extensions}
  {attachFile}
  {placeholder}
  {boundary}
  {readonly}
  field={key.key}
  canEmbedFiles={false}
  withSideMenu={false}
  on:focus
  on:blur
  on:update
  on:open-document
/>
