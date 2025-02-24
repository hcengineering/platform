//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { type Editor } from '@tiptap/core'
import documents, {
  ControlledDocumentState,
  DocumentState,
  type EditorMode,
  type ControlledDocument,
  type DocumentReviewRequest
} from '@hcengineering/controlled-documents'
import { generateId, type Ref } from '@hcengineering/core'
import { getCurrentEmployee } from '@hcengineering/contact'
import { RequestStatus } from '@hcengineering/request'
import { getClient } from '@hcengineering/presentation'
import { type ActionContext } from '@hcengineering/text-editor'
import { getNodeElement, selectNode, nodeUuidName } from '@hcengineering/text-editor-resources'

import { showAddCommentPopupFx } from './stores/editors/document'
import { $editorMode } from './stores/editors/document/editor'

async function getCurrentReviewRequest (doc: ControlledDocument): Promise<DocumentReviewRequest | undefined> {
  const client = getClient()

  return await client.findOne(documents.class.DocumentReviewRequest, {
    attachedTo: doc._id,
    attachedToClass: doc._class,
    status: RequestStatus.Active
  })
}

async function getDocumentStateForCurrentUser (
  doc: ControlledDocument
): Promise<DocumentState | ControlledDocumentState | null> {
  if (doc == null) {
    return null
  }

  const reviewRequest = await getCurrentReviewRequest(doc)

  if (doc.controlledState === ControlledDocumentState.InReview) {
    if (reviewRequest == null) {
      return ControlledDocumentState.InReview
    }

    const me = getCurrentEmployee()
    if (reviewRequest.approved?.includes(me)) {
      return ControlledDocumentState.Reviewed
    }
  }

  if (doc.controlledState != null) {
    return doc.controlledState
  }

  return doc.state
}

function isDocumentOwner (doc: ControlledDocument): boolean {
  if (doc == null) {
    return false
  }

  const employee = getCurrentEmployee()

  return doc.owner === employee
}

function isDocumentCoAuthor (doc: ControlledDocument): boolean {
  if (doc == null) {
    return false
  }

  const employee = getCurrentEmployee()

  if (employee === undefined) {
    return false
  }

  return doc.coAuthors.includes(employee)
}

function isDocumentReviewer (doc: ControlledDocument): boolean {
  if (doc == null) {
    return false
  }

  const employee = getCurrentEmployee()
  if (employee == null) {
    return false
  }
  return doc.reviewers?.includes(employee) ?? false
}

function canViewDocumentComments (doc: ControlledDocument, mode: EditorMode): boolean {
  return (
    (isDocumentOwner(doc) || isDocumentCoAuthor(doc) || isDocumentReviewer(doc)) &&
    (mode === 'viewing' || mode === 'editing')
  )
}

async function canAddDocumentComments (doc: ControlledDocument, mode: EditorMode): Promise<boolean> {
  if (!canViewDocumentComments(doc, mode)) {
    return false
  }

  const state = await getDocumentStateForCurrentUser(doc)

  if (state === DocumentState.Draft) {
    return isDocumentOwner(doc) || isDocumentCoAuthor(doc)
  }

  if (state === ControlledDocumentState.InReview) {
    return isDocumentOwner(doc) || isDocumentCoAuthor(doc) || isDocumentReviewer(doc)
  }

  return false
}

function markNodeWithUuid (editor: Editor): string | undefined {
  if (editor === undefined) {
    return
  }

  const nodeId = generateId()
  editor.commands.setNodeUuid(nodeId)

  return nodeId
}

export async function comment (editor: Editor, event: MouseEvent, ctx: ActionContext): Promise<void> {
  const { objectId, objectClass } = ctx
  if (objectId === undefined || objectClass === undefined) {
    return
  }

  let selectedNodeId = editor.extensionStorage[nodeUuidName].activeNodeUuid

  if (selectedNodeId == null) {
    selectedNodeId = markNodeWithUuid(editor)
  }

  if (selectedNodeId == null) {
    return
  }

  await showAddCommentPopupFx({
    element: getNodeElement(editor, selectedNodeId),
    nodeId: selectedNodeId
  })

  selectNode(editor, selectedNodeId)
}

export async function isCommentVisible (editor: Editor, ctx: ActionContext): Promise<boolean> {
  const { objectId, objectClass } = ctx
  if (objectId === undefined || objectClass === undefined) {
    return false
  }

  const client = getClient()
  if (!client.getHierarchy().isDerived(objectClass, documents.class.ControlledDocument)) {
    return false
  }

  const doc = await client.findOne(documents.class.ControlledDocument, {
    _id: objectId as Ref<ControlledDocument>
  })

  if (doc === undefined) {
    return false
  }

  // TODO: move editor mode tracking to a new extension!
  const mode = $editorMode.getState()

  return await canAddDocumentComments(doc, mode)
}
