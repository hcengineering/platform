//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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

import { textEditorId } from './plugin'

export * from '@hcengineering/presentation/src/types'
export { default as Collaboration } from './components/Collaboration.svelte'
export { default as CollaborationDiffViewer } from './components/CollaborationDiffViewer.svelte'
export { default as CollaboratorEditor } from './components/CollaboratorEditor.svelte'
export { default as FullDescriptionBox } from './components/FullDescriptionBox.svelte'
export { default as MarkupDiffViewer } from './components/MarkupDiffViewer.svelte'
export { default as ReferenceInput } from './components/ReferenceInput.svelte'
export { default as StringDiffViewer } from './components/StringDiffViewer.svelte'
export { default as StyleButton } from './components/StyleButton.svelte'
export { default as StyledTextArea } from './components/StyledTextArea.svelte'
export { default as StyledTextBox } from './components/StyledTextBox.svelte'
export { default as StyledTextEditor } from './components/StyledTextEditor.svelte'
export { default as TextEditor } from './components/TextEditor.svelte'
export { default as TextEditorStyleToolbar } from './components/TextEditorStyleToolbar.svelte'
export { default as AttachIcon } from './components/icons/Attach.svelte'
export { default as TableOfContents } from './components/toc/TableOfContents.svelte'
export * from './components/node-view'
export { default } from './plugin'
export * from './types'
export * from './utils'

export { FocusExtension, type FocusOptions, type FocusStorage } from './components/extension/focus'
export { HeadingsExtension, type HeadingsOptions, type HeadingsStorage } from './components/extension/headings'
export {
  IsEmptyContentExtension,
  type IsEmptyContentOptions,
  type IsEmptyContentStorage
} from './components/extension/isEmptyContent'
export {
  NodeHighlightExtension,
  NodeHighlightType,
  type NodeHighlightExtensionOptions,
  highlightUpdateCommand
} from './components/extension/nodeHighlight'
export {
  NodeUuidExtension,
  type NodeUuidCommands,
  type NodeUuidOptions,
  type NodeUuidStorage
} from './components/extension/nodeUuid'
export { InlinePopupExtension } from './components/extension/inlinePopup'
export {
  InlineStyleToolbarExtension,
  type InlineStyleToolbarOptions,
  type InlineStyleToolbarStorage
} from './components/extension/inlineStyleToolbar'
export { ImageExtension, type ImageOptions } from './components/extension/imageExt'
export { TodoItemExtension, TodoListExtension } from './components/extension/todo'

export {
  TiptapCollabProvider,
  type TiptapCollabProviderConfiguration,
  createTiptapCollaborationData,
  minioDocumentId,
  mongodbDocumentId,
  platformDocumentId
} from './provider'
export { CollaborationIds } from './types'

export { textEditorId }
