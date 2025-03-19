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


import { type IntlString, mergeIds } from '@hcengineering/platform'
import exportPlugin, { exportId } from '@hcengineering/export'

export default mergeIds(exportId, exportPlugin, {
  string: {
    WorkspaceNamePattern: '' as IntlString,
    DataToExport: '' as IntlString,
    ExportDocuments: '' as IntlString,
    ExportIssues: '' as IntlString,
    ExportTestCases: '' as IntlString,
    ExportTestRuns: '' as IntlString,
    ExportTestPlans: '' as IntlString,
    ExportFormat: '' as IntlString,
    ExportJSON: '' as IntlString,
    ExportCSV: '' as IntlString,
    ExportUnifiedFormat: '' as IntlString,
    ExportIncludeContent: '' as IntlString,
    ExportEverything: '' as IntlString,
    ExportAttributesOnly: '' as IntlString,
    ExportRequestSuccess: '' as IntlString,
    ExportRequestSuccessMessage: '' as IntlString,
    ExportRequestFailed: '' as IntlString,
    ExportRequestFailedMessage: '' as IntlString,
    ExportCompleted: '' as IntlString,
    ExportFailed: '' as IntlString
  }
})
