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

import testManagement from '@hcengineering/test-management'
import { loadMetadata } from '@hcengineering/platform'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(testManagement.icon, {
  TestCase: `${icons}#testCase`,
  TestManagementApplication: `${icons}#testManagementApplication`,
  TestManagement: `${icons}#testCase`,
  TestManagementVersion: `${icons}#testCase`,
  TestCases: `${icons}#testCase`,
  Home: `${icons}#home`,
  Estimation: `${icons}#testCase`,
  TestSuite: `${icons}#testSuite`,
  TestProject: `${icons}#project`,
  TestSuites: `${icons}#testSuite`,
  TestRuns: `${icons}#testRun`,
  RedCircle: `${icons}#red-circle`,
  Document: `${icons}#document`,
  StatusDraft: `${icons}#status-draft`,
  StatusReview: `${icons}#status-review`,
  StatusReviewComments: `${icons}#status-review-comments`,
  StatusApproved: `${icons}#status-approved`,
  StatusRejected: `${icons}#status-canceled`,
  TestLibrary: `${icons}#test-library`,
  TestResult: `${icons}#testResult`,
  StatusNonTested: `${icons}#status-untested`,
  StatusBlocked: `${icons}#status-blocked`,
  StatusPassed: `${icons}#status-passed`,
  StatusFailed: `${icons}#status-failed`,
  Run: `${icons}#run`
})
