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
import { isTextStylingEnabled, openBackgroundColorOptions, openTextColorOptions } from './components/extension/colors'
import { downloadImage, expandImage, moreImageActions, openImage } from './components/extension/imageExt'
import { createInlineComment, shouldShowCreateInlineCommentAction } from './components/extension/inlineComment'
import { configureNote, isEditableNote } from './components/extension/note'
import {
  isEditableTableActive,
  isTableToolbarContext,
  openTableOptions,
  selectTable
} from './components/extension/table/table'
import {
  convertToEmbedPreviewAction,
  convertToEmbedPreviewActionIsActive,
  convertToLinkPreviewAction,
  convertToLinkPreviewActionIsActive,
  shouldShowConvertToEmbedPreviewAction,
  shouldShowConvertToLinkPreviewAction,
  shouldShowCopyPreviewLinkAction,
  copyPreviewLinkAction
} from './components/extension/embed/embed'
import { formatLink, isEditable, isHeadingVisible } from './utils'
export { SmartPasteExtension as TransformPastedContentExtension } from './components/extension/shortcuts/smartPaste'
export { getReferenceFromUrl, getReferenceLabel, getTargetObjectFromUrl } from './components/extension/reference'
export { TodoItemExtension, TodoListExtension } from './components/extension/todo/todo'

export * from '@hcengineering/presentation/src/types'
export { default as Collaboration } from './components/Collaboration.svelte'
export { default as CollaborationDiffViewer } from './components/CollaborationDiffViewer.svelte'
export { default as CollaborativeAttributeBox } from './components/CollaborativeAttributeBox.svelte'
export { default as CollaborativeAttributeSectionBox } from './components/CollaborativeAttributeSectionBox.svelte'
export { default as CollaborativeTextEditor } from './components/CollaborativeTextEditor.svelte'
export { default as CollaboratorEditor } from './components/CollaboratorEditor.svelte'
export * from './components/editor/actions'
export { default as FullDescriptionBox } from './components/FullDescriptionBox.svelte'
export { default as AttachIcon } from './components/icons/Attach.svelte'
export { default as TableIcon } from './components/icons/Table.svelte'
export { default as MarkupDiffViewer } from './components/MarkupDiffViewer.svelte'
export * from './components/node-view'
export { default as ReferenceInput } from './components/ReferenceInput.svelte'
export { default as StringDiffViewer } from './components/StringDiffViewer.svelte'
export { default as StyledTextArea } from './components/StyledTextArea.svelte'
export { default as StyledTextBox } from './components/StyledTextBox.svelte'
export { default as StyledTextEditor } from './components/StyledTextEditor.svelte'
export { default as StyleButton } from './components/TextActionButton.svelte'
export { default as TextEditor } from './components/TextEditor.svelte'
export { default as TableOfContents } from './components/toc/TableOfContents.svelte'
export { default as TableOfContentsContent } from './components/toc/TableOfContentsContent.svelte'
export type { EditorKitOptions } from './kits/editor-kit'
export * from './utils'
export * from './components/editor-context'

export * from './command/deleteAttachment'
export { EmojiExtension } from './components/extension/emoji'
export { FocusExtension, type FocusOptions, type FocusStorage } from './components/extension/hooks/focus'
export {
  ToCExtension as HeadingsExtension,
  type ToCExtensionOptions as HeadingsOptions,
  type ToCExtensionStorage as HeadingsStorage
} from './components/extension/toc'
export { ImageExtension } from './components/extension/imageExt'
export {
  ImageUploadExtension,
  type ImageUploadExtensionOptions as ImageUploadOptions
} from './components/extension/shortcuts/imageUpload'
export {
  IsEmptyContentExtension,
  type IsEmptyContentOptions,
  type IsEmptyContentStorage
} from './components/extension/hooks/isEmptyContent'
export {
  highlightUpdateCommand,
  QMSInlineCommentExtension as NodeHighlightExtension,
  CommentHighlightType as NodeHighlightType,
  type QMSInlineCommentExtensionOptions as NodeHighlightExtensionOptions
} from './components/extension/qms/qmsInlineComment'
export {
  getNodeElement,
  QMSInlineCommentMark as NodeUuidExtension,
  qmsInlineCommentMarkName as nodeUuidName,
  selectNode,
  type QMSInlineCommentMarkOptions as NodeUuidOptions
} from './components/extension/qms/qmsInlineCommentMark'
export { referenceConfig, ReferenceExtension } from './components/extension/reference'
export { type Provider } from './provider/types'
export { createTiptapCollaborationData } from './provider/utils'

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

    ShouldShowConvertToLinkPreviewAction: shouldShowConvertToLinkPreviewAction,
    ConvertToLinkPreviewActionIsActive: convertToLinkPreviewActionIsActive,
    ConvertToLinkPreviewAction: convertToLinkPreviewAction,

    ShouldShowConvertToEmbedPreviewAction: shouldShowConvertToEmbedPreviewAction,
    ConvertToEmbedPreviewActionIsActive: convertToEmbedPreviewActionIsActive,
    ConvertToEmbedPreviewAction: convertToEmbedPreviewAction,

    ShouldShowCopyPreviewLinkAction: shouldShowCopyPreviewLinkAction,
    CopyPreviewLinkAction: copyPreviewLinkAction,

    SetBackgroundColor: openBackgroundColorOptions,
    SetTextColor: openTextColorOptions
  }
})
