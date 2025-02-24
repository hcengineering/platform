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
import { createEffect, createStore, forward } from 'effector'
import { type Attachment } from '@hcengineering/attachment'
import { type Ref, generateId } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type CompAndProps, type PopupAlignment, popupstore, showPopup } from '@hcengineering/ui'
import documents, { type Document, type DocumentComment } from '@hcengineering/controlled-documents'
import { isDocumentCommentAttachedTo } from '../../../utils'
import {
  DocumentCommentPopupCategory,
  type DocumentCommentsFilter,
  documentCommentPopupsOpened,
  documentCommentsDisplayRequested,
  documentCommentsHighlightCleared,
  documentCommentsHighlightUpdated,
  documentCommentsLocationNavigateRequested,
  documentCommentsNavigateRequested,
  documentCommentsShowResolvedToggled,
  documentCommentsSortByChanged,
  documentCommentsUpdated,
  controlledDocumentClosed,
  savedAttachmentsUpdated
} from './actions'

export const $areDocumentCommentPopupsOpened = createStore(false).on(
  documentCommentPopupsOpened,
  (_, isOpened) => isOpened
)
popupstore.subscribe((popupProps: CompAndProps[]) => {
  documentCommentPopupsOpened(
    popupProps.findIndex((props) => props.options.category === DocumentCommentPopupCategory) >= 0
  )
})

export const addCommentFx = createEffect(
  async (payload: {
    document: Document | null
    content: string
    nodeId?: string
    messageId?: Ref<DocumentComment>
  }) => {
    const { content, document, nodeId } = payload

    if (document == null || content == null) {
      return
    }

    const client = getClient()
    const space = document.space
    const messageId = payload.messageId ?? generateId()

    // Get index for next comment
    const incResult = await client.update(document, { $inc: { commentSequence: 1 } }, true)
    const index = (incResult as any).object.commentSequence as number

    await client.addCollection(
      documents.class.DocumentComment,
      space,
      document._id,
      document._class,
      'comments',
      {
        message: content,
        nodeId,
        resolved: false,
        index
      },
      messageId
    )

    const comment = await client.findOne(documents.class.DocumentComment, { _id: messageId })

    return comment
  }
)

export const resolveCommentFx = createEffect(
  async (payload: { comment: DocumentComment | null | undefined, resolved: boolean }) => {
    const { comment, resolved } = payload

    if (comment === null || comment === undefined) {
      return null
    }

    await getClient().update(comment, { resolved })

    return { ...comment, resolved }
  }
)

export const showDocumentCommentsPopupFx = createEffect(
  (payload: { element?: PopupAlignment, nodeId?: string | null }) => {
    showPopup(
      documents.component.DocumentCommentsPopup,
      payload,
      payload.element,
      documentCommentsHighlightCleared,
      undefined,
      { category: DocumentCommentPopupCategory, overlay: true }
    )
  }
)

export const showAddCommentPopupFx = createEffect((payload: { element?: PopupAlignment, nodeId?: string | null }) => {
  showPopup(
    documents.component.AddCommentPopup,
    payload,
    payload.element,
    (result) => {
      if (result === null || result === undefined) {
        documentCommentsHighlightCleared()
      } else {
        documentCommentsDisplayRequested(payload)
      }
    },
    undefined,
    { category: DocumentCommentPopupCategory, overlay: true }
  )
})

export const $documentCommentsFilter = createStore<DocumentCommentsFilter>({
  showResolved: false,
  sortBy: 'createdOn'
})
  .on(documentCommentsShowResolvedToggled, (state) => ({ ...state, showResolved: !state.showResolved }))
  .on(documentCommentsSortByChanged, (state, sortBy) => ({ ...state, sortBy }))
  .reset(controlledDocumentClosed)

export const $isDocumentCommentsFilterDirty = $documentCommentsFilter.map(
  (filter) =>
    filter.showResolved !== $documentCommentsFilter.defaultState.showResolved ||
    filter.sortBy !== $documentCommentsFilter.defaultState.sortBy
)

export const $documentComments = createStore<DocumentComment[]>([])
  .on(documentCommentsUpdated, (_, payload) => payload ?? [])
  .on(addCommentFx.doneData, (comments, comment) => {
    if (comment == null) {
      return
    }
    const result = comments.filter((c) => c._id !== comment._id)
    return [comment, ...result]
  })
  .on(resolveCommentFx.doneData, (attachments, comment) =>
    attachments.map((item) => (item._id === comment?._id ? comment : item))
  )
  .reset(controlledDocumentClosed)

export const $documentCommentNavigateTo = createStore<DocumentComment | null>(null)
  .on(documentCommentsNavigateRequested, (_, { value }) => {
    return value
  })
  .on(documentCommentsHighlightUpdated, (value, location) => {
    if (location === null) {
      return null
    }

    if (!isDocumentCommentAttachedTo(value, location)) {
      return null
    }
  })
  .reset([controlledDocumentClosed, documentCommentsHighlightCleared])

export const $documentCommentHighlightedLocation = createStore<{
  nodeId: string | null
} | null>(null)
  .on(documentCommentsHighlightUpdated, (_, payload) => (payload !== null ? { nodeId: payload.nodeId ?? null } : null))
  .on([showDocumentCommentsPopupFx, showAddCommentPopupFx], (_, { nodeId }) => ({
    nodeId: nodeId ?? null
  }))
  .on(documentCommentsNavigateRequested, (_, { value }) => (value !== null ? { nodeId: value.nodeId ?? null } : null))
  .reset([controlledDocumentClosed, documentCommentsHighlightCleared])

export const $savedAttachments = createStore<Array<Ref<Attachment>>>([])
  .on(savedAttachmentsUpdated, (_, payload) => payload)
  .reset(controlledDocumentClosed)

forward({ from: documentCommentsLocationNavigateRequested, to: documentCommentsHighlightUpdated })
