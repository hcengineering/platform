//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { IntlString, mergeIds } from '@hcengineering/platform'
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
