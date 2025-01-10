//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023, 2024 Hardcore Engineering Inc.
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

import { type Resources } from '@hcengineering/platform'
import { formatLink } from './kits/default-kit'
import { isEditable, isHeadingVisible } from './kits/editor-kit'
import {
  openTableOptions,
  isEditableTableActive,
  isTableToolbarContext,
  selectTable
} from './components/extension/table/table'
import { openImage, downloadImage, expandImage, moreImageActions } from './components/extension/imageExt'
import { configureNote, isEditableNote } from './components/extension/note'
import { createInlineComment, shouldShowCreateInlineCommentAction } from './components/extension/inlineComment'
import { isTextStylingEnabled, openBackgroundColorOptions, openTextColorOptions } from './components/extension/colors'

export * from '@hcengineering/presentation/src/types'
export type { EditorKitOptions } from './kits/editor-kit'
export { default as Collaboration } from './components/Collaboration.svelte'
export { default as CollaborationDiffViewer } from './components/CollaborationDiffViewer.svelte'
export { default as CollaborativeAttributeBox } from './components/CollaborativeAttributeBox.svelte'
export { default as CollaborativeAttributeSectionBox } from './components/CollaborativeAttributeSectionBox.svelte'
export { default as CollaborativeTextEditor } from './components/CollaborativeTextEditor.svelte'
export { default as CollaboratorEditor } from './components/CollaboratorEditor.svelte'
export { default as FullDescriptionBox } from './components/FullDescriptionBox.svelte'
export { default as MarkupDiffViewer } from './components/MarkupDiffViewer.svelte'
export { default as ReferenceInput } from './components/ReferenceInput.svelte'
export { default as StringDiffViewer } from './components/StringDiffViewer.svelte'
export { default as StyleButton } from './components/TextActionButton.svelte'
export { default as StyledTextArea } from './components/StyledTextArea.svelte'
export { default as StyledTextBox } from './components/StyledTextBox.svelte'
export { default as StyledTextEditor } from './components/StyledTextEditor.svelte'
export { default as TextEditor } from './components/TextEditor.svelte'
export { default as TextEditorToolbar } from './components/TextEditorToolbar.svelte'
export { default as AttachIcon } from './components/icons/Attach.svelte'
export { default as TableIcon } from './components/icons/Table.svelte'
export { default as TableOfContents } from './components/toc/TableOfContents.svelte'
export { default as TableOfContentsContent } from './components/toc/TableOfContentsContent.svelte'
export * from './components/editor/actions'
export * from './components/node-view'
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
  type NodeUuidOptions,
  type NodeUuidStorage,
  getNodeElement,
  selectNode,
  nodeUuidName
} from './components/extension/nodeUuid'
export { InlinePopupExtension } from './components/extension/inlinePopup'
export { InlineToolbarExtension, type InlineStyleToolbarOptions } from './components/extension/inlineToolbar'
export { ImageExtension, type ImageOptions } from './components/extension/imageExt'
export { ImageUploadExtension, type ImageUploadOptions } from './components/extension/imageUploadExt'
export * from './command/deleteAttachment'
export { createTiptapCollaborationData } from './provider/utils'
export { type Provider } from './provider/types'

export default async (): Promise<Resources> => ({
  function: {
    FormatLink: formatLink,
    OpenTableOptions: openTableOptions,
    SelectTable: selectTable,
    OpenImage: openImage,
    ExpandImage: expandImage,
    DownloadImage: downloadImage,
    MoreImageActions: moreImageActions,
    ConfigureNote: configureNote,
    IsEditableTableActive: isEditableTableActive,
    IsTableToolbarContext: isTableToolbarContext,
    IsEditableNote: isEditableNote,
    IsEditable: isEditable,
    IsHeadingVisible: isHeadingVisible,
    IsTextStylingEnabled: isTextStylingEnabled,

    CreateInlineComment: createInlineComment,
    ShouldShowCreateInlineCommentAction: shouldShowCreateInlineCommentAction,

    SetBackgroundColor: openBackgroundColorOptions,
    SetTextColor: openTextColorOptions
  }
})
