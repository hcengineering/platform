//
import training, { type Training } from '@hcengineering/training'
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
import { createEffect, forward, merge, sample } from 'effector'
import {
  type Document,
  type ControlledDocument,
  type DocumentComment,
  type DocumentTraining,
  type Project
} from '@hcengineering/controlled-documents'
import attachment from '@hcengineering/attachment'
import { type Class, type DocumentQuery, type Ref, SortingOrder } from '@hcengineering/core'
import { createQuery } from '@hcengineering/presentation'
import { RequestStatus } from '@hcengineering/request'

import documents from '../../../plugin'
import {
  type DocumentCommentsFilter,
  documentCommentsUpdated,
  approvalRequestUpdated,
  controlledDocumentClosed,
  controlledDocumentOpened,
  controlledDocumentUpdated,
  documentAllVersionsUpdated,
  reviewRequestUpdated,
  savedAttachmentsUpdated,
  documentSnapshotsUpdated,
  trainingUpdated,
  projectUpdated,
  projectDocumentsUpdated,
  reviewRequestHistoryUpdated
} from './actions'
import { $documentCommentsFilter } from './documentComments'
import { $controlledDocument, $documentTraining } from './editor'

const controlledDocumentQuery = createQuery(true)
const documentVersionsQuery = createQuery(true)
const documentSnapshotsQuery = createQuery(true)
const reviewRequestQuery = createQuery(true)
const reviewRequestHistoryQuery = createQuery(true)
const approvalRequestQuery = createQuery(true)
const documentCommentsQuery = createQuery(true)
const workingCopyMetadataQuery = createQuery(true)
const savedAttachmentsQuery = createQuery(true)
const trainingQuery = createQuery(true)
const projectQuery = createQuery(true)
const projectDocumentsQuery = createQuery(true)

const queryControlledDocumentFx = createEffect(
  (payload: { _id: Ref<ControlledDocument>, _class: Ref<Class<ControlledDocument>> }) => {
    const { _class, _id } = payload

    if (_class == null || _id == null) {
      controlledDocumentQuery.unsubscribe()
      return
    }

    controlledDocumentQuery.query(
      _class,
      { _id },
      (result) => {
        if (result !== null && result !== undefined && result.length > 0) {
          controlledDocumentUpdated(result[0])
        }
      },
      {
        lookup: {
          template: documents.class.Document
        }
      }
    )
  }
)

const queryDocumentVersionsFx = createEffect((payload: ControlledDocument) => {
  if (payload == null) {
    documentVersionsQuery.unsubscribe()
    return
  }

  documentVersionsQuery.query(
    documents.class.ControlledDocument,
    {
      seqNumber: payload.seqNumber,
      template: payload.template
    },
    (result) => {
      documentAllVersionsUpdated(result ?? [])
    },
    {
      sort: {
        major: SortingOrder.Descending,
        minor: SortingOrder.Descending
      }
    }
  )
})

const queryReviewRequestFx = createEffect(
  (payload: { _id: Ref<ControlledDocument>, _class: Ref<Class<ControlledDocument>> }) => {
    const { _id, _class } = payload
    if (_id == null || _class == null) {
      reviewRequestQuery.unsubscribe()
      return
    }
    reviewRequestQuery.query(
      documents.class.DocumentReviewRequest,
      { attachedTo: _id, attachedToClass: _class, status: RequestStatus.Active },
      (result) => {
        if (result !== null && result !== undefined && result.length > 0) {
          reviewRequestUpdated(result[0])
        }
      }
    )
  }
)

const queryReviewRequestHistoryFx = createEffect(
  (payload: { _id: Ref<ControlledDocument>, _class: Ref<Class<ControlledDocument>> }) => {
    const { _id, _class } = payload
    if (_id == null || _class == null) {
      reviewRequestHistoryQuery.unsubscribe()
      return
    }
    reviewRequestHistoryQuery.query(
      documents.class.DocumentReviewRequest,
      { attachedTo: _id, attachedToClass: _class },
      (result) => {
        if (result !== null && result !== undefined && result.length > 0) {
          reviewRequestHistoryUpdated(result)
        }
      }
    )
  }
)

const queryApprovalRequestFx = createEffect(
  (payload: { _id: Ref<ControlledDocument>, _class: Ref<Class<ControlledDocument>> }) => {
    const { _id, _class } = payload
    if (_id == null || _class == null) {
      approvalRequestQuery.unsubscribe()
      return
    }
    approvalRequestQuery.query(
      documents.class.DocumentApprovalRequest,
      { attachedTo: _id, attachedToClass: _class, status: RequestStatus.Active },
      (result) => {
        if (result !== null && result !== undefined && result.length > 0) {
          approvalRequestUpdated(result[0])
        }
      }
    )
  }
)

const queryDocumentCommentsFx = createEffect(
  (payload: { document: Document | null, filter: DocumentCommentsFilter }) => {
    const { filter, document } = payload
    if (document === null) {
      documentCommentsQuery.unsubscribe()
      return
    }

    const query: DocumentQuery<DocumentComment> = {
      attachedTo: document._id
    }
    if (!filter.showResolved) {
      query.resolved = { $ne: true }
    }

    documentCommentsQuery.query(
      documents.class.DocumentComment,
      query,
      (result) => {
        documentCommentsUpdated(result ?? [])
      },
      {
        sort: {
          [filter.sortBy]: SortingOrder.Descending
        }
      }
    )
  }
)

const queryDocumentSnapshotsFx = createEffect((payload: { doc: Document | null }) => {
  const { doc } = payload
  if (doc === null) {
    documentSnapshotsQuery.unsubscribe()
    return
  }

  documentSnapshotsQuery.query(
    documents.class.ControlledDocumentSnapshot,
    {
      attachedTo: doc._id,
      attachedToClass: doc._class
    },
    (result) => {
      documentSnapshotsUpdated(result ?? [])
    },
    {
      sort: {
        createdOn: SortingOrder.Descending
      }
    }
  )
})

const querySavedAttachmentsFx = createEffect((_: any) => {
  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (result) => {
    savedAttachmentsUpdated(result?.map((item) => item.attachedTo) ?? [])
  })
})

const queryTrainingFx = createEffect(({ documentTraining }: { documentTraining: DocumentTraining | null }) => {
  if (documentTraining === null) {
    trainingQuery.unsubscribe()
    return
  }

  trainingQuery.query(
    training.class.Training,
    { _id: (documentTraining?.enabled ? documentTraining?.training : null) ?? ('missing' as Ref<Training>) },
    (result) => {
      trainingUpdated(result[0] ?? null)
    }
  )
})

const queryProjectFx = createEffect(({ project }: { project: Ref<Project> }) => {
  if (project === null) {
    projectQuery.unsubscribe()
    return
  }

  projectQuery.query(documents.class.Project, { _id: project }, (result) => {
    projectUpdated(result[0] ?? null)
  })
})

const queryProjectDocumentsFx = createEffect(({ project }: { project: Ref<Project> }) => {
  if (project === null) {
    projectDocumentsQuery.unsubscribe()
    return
  }

  projectDocumentsQuery.query(documents.class.ProjectDocument, { project }, (result) => {
    projectDocumentsUpdated(result ?? [])
  })
})

const unsubscribeFx = createEffect(() => {
  controlledDocumentQuery.unsubscribe()
  reviewRequestQuery.unsubscribe()
  approvalRequestQuery.unsubscribe()
  documentCommentsQuery.unsubscribe()
  workingCopyMetadataQuery.unsubscribe()
  documentVersionsQuery.unsubscribe()
  savedAttachmentsQuery.unsubscribe()
  documentSnapshotsQuery.unsubscribe()
  trainingQuery.unsubscribe()
  projectDocumentsQuery.unsubscribe()
})

forward({
  from: controlledDocumentOpened,
  to: [
    queryControlledDocumentFx,
    queryReviewRequestFx,
    queryReviewRequestHistoryFx,
    queryApprovalRequestFx,
    querySavedAttachmentsFx,
    queryProjectFx,
    queryProjectDocumentsFx
  ]
})
forward({ from: controlledDocumentClosed, to: unsubscribeFx })

sample({
  clock: merge([$controlledDocument, $documentCommentsFilter, documentCommentsUpdated]),
  source: { document: $controlledDocument, filter: $documentCommentsFilter },
  target: queryDocumentCommentsFx
})

forward({ from: controlledDocumentUpdated, to: queryDocumentVersionsFx })

sample({
  clock: controlledDocumentUpdated,
  source: { doc: $controlledDocument },
  target: queryDocumentSnapshotsFx
})

sample({
  clock: $documentTraining,
  source: { documentTraining: $documentTraining },
  target: queryTrainingFx
})
