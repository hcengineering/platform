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
    EditDoc: '' as AnyComponent,
    MyDocuments: '' as AnyComponent,
    NewDocumentHeader: '' as AnyComponent,
    Status: '' as AnyComponent,
    Version: '' as AnyComponent,
    Revision: '' as AnyComponent
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
    NoBaseVersion: '' as IntlString,
    CreateAnVersion: '' as IntlString,
    CreateDocumentVersion: '' as IntlString,
    Approvers: '' as IntlString,
    Status: '' as IntlString,
    LastRevision: '' as IntlString,
    DocumentApplication: '' as IntlString,
    MyDocuments: '' as IntlString,
    Library: '' as IntlString,
    Labels: '' as IntlString,
    Authors: '' as IntlString,
    AddLabel: '' as IntlString,
    DocumentVersionPlaceholder: '' as IntlString,

    PendingReview: '' as IntlString,
    Latest: '' as IntlString,
    Draft: '' as IntlString,
    Approved: '' as IntlString,
    Rejected: '' as IntlString,

    Description: '' as IntlString,
    DescriptionPlaceholder: '' as IntlString,
    Baseline: '' as IntlString,
    Reviewers: '' as IntlString,

    ViewMode: '' as IntlString,
    EditMode: '' as IntlString,
    SuggestMode: '' as IntlString,

    CreateDraft: '' as IntlString,
    SendForApproval: '' as IntlString,
    SendForReview: '' as IntlString,

    Requests: '' as IntlString,

    Approve: '' as IntlString,
    Reject: '' as IntlString,

    CompareTo: '' as IntlString
  }
})
