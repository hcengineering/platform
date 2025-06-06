//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import {
  type DocumentComment,
  type ControlledDocument,
  type Document,
  type DocumentApprovalRequest,
  type ControlledDocumentSnapshot,
  type DocumentReviewRequest,
  type DocumentSnapshot,
  type EditorMode,
  type Project,
  type ProjectDocument
} from '@hcengineering/controlled-documents'
import { type Attachment } from '@hcengineering/attachment'
import { type Class, type Ref, type WithLookup } from '@hcengineering/core'
import { type PopupAlignment } from '@hcengineering/ui'
import type { Training } from '@hcengineering/training'
import { createEvent } from 'effector'

const generateActionName = (action: string): string => `documents/actions/${action}`
export const documentCommentsSortingAttributes: Array<keyof DocumentComment> = ['createdOn', 'modifiedOn', 'createdBy']

export interface DocumentCommentsFilter {
  showResolved: boolean
  sortBy: (typeof documentCommentsSortingAttributes)[number]
}

export enum RightPanelTab {
  INFO = 'info',
  COMMENT = 'comment',
  APPROVALS = 'approvals'
}

export const DocumentCommentPopupCategory = 'document-comment-popup'

export const documentCommentPopupsOpened = createEvent<boolean>(generateActionName('documentCommentPopupsOpened'))

export const controlledDocumentOpened = createEvent<{
  _id: Ref<ControlledDocument>
  _class: Ref<Class<ControlledDocument>>
  project: Ref<Project>
}>(generateActionName('controlledDocumentOpened'))
export const controlledDocumentClosed = createEvent(generateActionName('controlledDocumentClosed'))

export const controlledDocumentUpdated = createEvent<WithLookup<ControlledDocument>>(
  generateActionName('controlledDocumentUpdated')
)

export const documentAllVersionsUpdated = createEvent<ControlledDocument[]>(
  generateActionName('documentAllVersionsUpdated')
)

export const reviewRequestUpdated = createEvent<DocumentReviewRequest>(generateActionName('reviewRequestUpdated'))

export const reviewRequestHistoryUpdated = createEvent<DocumentReviewRequest[]>(
  generateActionName('reviewRequestHistoryUpdated')
)

export const approvalRequestUpdated = createEvent<DocumentApprovalRequest>(generateActionName('approvalRequestUpdated'))

export const editorModeUpdated = createEvent<EditorMode>(generateActionName('editorModeUpdated'))

export const rightPanelTabChanged = createEvent<RightPanelTab | null>(generateActionName('rightPanelTabChanged'))

export const documentCommentsSortByChanged = createEvent<(typeof documentCommentsSortingAttributes)[number]>(
  generateActionName('documentCommentsSortByChanged')
)

export const documentCommentsShowResolvedToggled = createEvent(
  generateActionName('documentCommentsShowResolvedToggled')
)

export const comparisonCleared = createEvent(generateActionName('comparisonCleared'))

export const comparisonRequested = createEvent<Document | DocumentSnapshot>(generateActionName('comparisonRequested'))

export const documentCommentsUpdated = createEvent<DocumentComment[]>(generateActionName('documentCommentsUpdated'))

export const documentSnapshotsUpdated = createEvent<ControlledDocumentSnapshot[]>(
  generateActionName('documentSnapshotsUpdated')
)

export const savedAttachmentsUpdated = createEvent<Array<Ref<Attachment>>>(
  generateActionName('savedAttachmentsUpdated')
)

export const documentCommentsDisplayRequested = createEvent<{
  nodeId?: string | null
  element?: PopupAlignment
}>(generateActionName('documentCommentsDisplayRequested'))

export const documentCommentsNavigateRequested = createEvent<{ value: DocumentComment | null }>(
  generateActionName('documentCommentsNavigateRequested')
)

export const documentCommentsLocationNavigateRequested = createEvent<{
  nodeId?: string | null
}>(generateActionName('documentCommentsLocationNavigateRequested'))

export const documentCommentsHighlightUpdated = createEvent<{
  nodeId?: string | null
} | null>(generateActionName('documentCommentsHighlightUpdated'))

export const documentCommentsHighlightCleared = createEvent(generateActionName('documentCommentsHighlightCleared'))

export const trainingUpdated = createEvent<Training | null>(generateActionName('trainingUpdated'))

export const projectUpdated = createEvent<Project | null>(generateActionName('projectUpdated'))

export const projectDocumentsUpdated = createEvent<ProjectDocument[]>(generateActionName('projectDocumentsUpdated'))
