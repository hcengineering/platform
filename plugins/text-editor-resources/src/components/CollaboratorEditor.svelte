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
  import { type Doc } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { KeyedAttribute } from '@hcengineering/presentation'
  import textEditor, { CollaborationUser, TextEditorCommandHandler } from '@hcengineering/text-editor'
  import { AnySvelteComponent, IconSize, registerFocus } from '@hcengineering/ui'
  import { FocusPosition } from '@tiptap/core'

  import { EditorKitOptions } from '../kits/editor-kit'
  import CollaborativeTextEditor from './CollaborativeTextEditor.svelte'
  import { FileAttachFunction } from './extension/types'

  export let object: Doc
  export let attribute: KeyedAttribute

  export let user: CollaborationUser
  export let userComponent: AnySvelteComponent | undefined = undefined

  export let readonly = false

  export let buttonSize: IconSize = 'small'
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder

  export let overflow: 'auto' | 'none' = 'auto'
  export let editorAttributes: Record<string, string> = {}
  export let boundary: HTMLElement | undefined = undefined

  export let attachFile: FileAttachFunction | undefined = undefined
  export let kitOptions: Partial<EditorKitOptions> = {}
  export let requestSideSpace: ((width: number) => void) | undefined = undefined

  let collaborativeEditor: CollaborativeTextEditor

  export function commands (): TextEditorCommandHandler | undefined {
    return collaborativeEditor?.commands()
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
      return true
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
    {object}
    {attribute}
    {user}
    {userComponent}
    {readonly}
    {buttonSize}
    {placeholder}
    {overflow}
    {boundary}
    {attachFile}
    {editorAttributes}
    {kitOptions}
    {requestSideSpace}
    on:editor
    on:update
    on:blur
    on:loaded
    on:focus={handleFocus}
  />
</div>

<style lang="scss">
  .root {
    font-size: 0.9375rem;
  }
</style>
