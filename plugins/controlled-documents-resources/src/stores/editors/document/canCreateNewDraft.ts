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

import { DocumentState } from '@hcengineering/controlled-documents'
import { combine } from 'effector'
import { $controlledDocument, $documentAllVersionsDescSorted } from './editor'

export const $canCreateNewDraft = combine($controlledDocument, $documentAllVersionsDescSorted, (document, versions) => {
  if (document == null) return false

  const currentIndex = versions.findIndex((p) => p._id === document._id)
  const forbiddenStates = [DocumentState.Draft, DocumentState.Obsolete]

  return (
    versions.slice(0, currentIndex).every((p) => p.state === DocumentState.Deleted) &&
    !forbiddenStates.includes(document.state)
  )
})
