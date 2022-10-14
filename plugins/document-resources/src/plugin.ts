//
// Copyright © 2022 Hardcore Engineering Inc.
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

import document, { documentId } from '@hcengineering/document'
import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

export default mergeIds(documentId, document, {
  component: {
    EditDoc: '' as AnyComponent
  },
  string: {
    Apply: '' as IntlString,
    DocumentNamePlaceholder: '' as IntlString,
    Name: '' as IntlString,
    Cancel: '' as IntlString,
    Documents: '' as IntlString,
    DocumentCreateLabel: '' as IntlString,
    EditorPlaceholder: '' as IntlString,
    Versions: '' as IntlString,
    Document: '' as IntlString,
    SearchDocument: '' as IntlString,
    Version: '' as IntlString,
    Revision: '' as IntlString,
    NoVersions: '' as IntlString,
    CreateAnVersion: '' as IntlString,
    CreateDocumentVersion: '' as IntlString,
    ApprovedBy: '' as IntlString,
    Status: '' as IntlString,
    LastRevision: '' as IntlString
  }
})
