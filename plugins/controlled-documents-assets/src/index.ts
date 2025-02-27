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
import documents from '@hcengineering/controlled-documents'
import { loadMetadata } from '@hcengineering/platform'
import icons from '../assets/icons.svg'

loadMetadata(documents.icon, {
  CheckmarkCircle: `${icons}#checkmark-circle`,
  Approvals: `${icons}#approvals`,
  DocumentApplication: `${icons}#documentapplication`,
  NewDocument: `${icons}#newdocument`,
  Folder: `${icons}#c-folder`,
  Document: `${icons}#document`,
  Library: `${icons}#library`,
  StateApproved: `${icons}#state-approved`,
  StateDraft: `${icons}#state-draft`,
  StateEffective: `${icons}#state-effective`,
  StateRejected: `${icons}#state-rejected`,
  StateObsolete: `${icons}#state-obsolete`,
  ArrowUp: `${icons}#arrow-up`,
  ArrowDown: `${icons}#arrow-down`,
  Configure: `${icons}#configure`
})
