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
//

import { ControlledDocumentState, DocumentState } from '@hcengineering/controlled-documents'
import { TrainingState } from '@hcengineering/training'
import { combine } from 'effector'
import { $documentComments } from './documentComments'
import { $controlledDocument, $documentState, $isLatestVersion, $reviewRequestHistory, $training } from './editor'

export const $canSendForApproval = combine(
  $controlledDocument,
  $isLatestVersion,
  $documentState,
  $documentComments,
  $training,
  $reviewRequestHistory,
  (document, isLatestVersion, state, comments, training, reviewHistory) => {
    let haveBeenReviewedOnce = false
    if (document !== null) {
      const reviews = (reviewHistory ?? []).filter((review) => review.attachedTo === document._id)
      if (reviews.length > 0) haveBeenReviewedOnce = true
    }
    return (
      isLatestVersion &&
      ((state === DocumentState.Draft && !haveBeenReviewedOnce) || state === ControlledDocumentState.Reviewed) &&
      comments.every((comment) => comment.resolved) &&
      (training === null || training.state === TrainingState.Released)
    )
  }
)
