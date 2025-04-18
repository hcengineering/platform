//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { DocumentState } from '@hcengineering/controlled-documents'
import { combine } from 'effector'
import { $canCreateNewDraft } from './canCreateNewDraft'
import { $controlledDocument, $documentLatestVersion } from './editor'

export const $canRestoreDraft = combine(
  $controlledDocument,
  $documentLatestVersion,
  $canCreateNewDraft,
  (document, latest, canCreateNewDraft) => {
    if (latest === null || document == null) return false
    return canCreateNewDraft && latest._id === document._id && document.state === DocumentState.Deleted
  }
)
