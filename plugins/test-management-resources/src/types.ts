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
import { type Asset, type IntlString } from '@hcengineering/platform'

import testManagement, { TestCaseStatus, TestRunStatus } from '@hcengineering/test-management'

/** @public */
export const defaultTestCaseStatuses = [
  TestCaseStatus.Draft,
  TestCaseStatus.ReadyForReview,
  TestCaseStatus.FixReviewComments,
  TestCaseStatus.Approved,
  TestCaseStatus.Rejected
]

/** @public */
export const testCaseStatusAssets: Record<TestCaseStatus, { icon: Asset, label: IntlString }> = {
  [TestCaseStatus.Draft]: { icon: testManagement.icon.StatusDraft, label: testManagement.string.StatusDraft },
  [TestCaseStatus.ReadyForReview]: {
    icon: testManagement.icon.StatusReview,
    label: testManagement.string.StatusReview
  },
  [TestCaseStatus.FixReviewComments]: {
    icon: testManagement.icon.StatusReviewComments,
    label: testManagement.string.StatusReviewComments
  },
  [TestCaseStatus.Approved]: { icon: testManagement.icon.StatusApproved, label: testManagement.string.StatusApproved },
  [TestCaseStatus.Rejected]: { icon: testManagement.icon.StatusRejected, label: testManagement.string.StatusRejected }
}

/** @public */
export const defaultTestRunStatuses = [
  TestRunStatus.NoTested,
  TestRunStatus.Blocked,
  TestRunStatus.Passed,
  TestRunStatus.Failed
]

/** @public */
export const testRunStatusAssets: Record<TestRunStatus, { icon: Asset, label: IntlString }> = {
  [TestRunStatus.NoTested]: {
    icon: testManagement.icon.StatusNonTested,
    label: testManagement.string.StatusNonTested
  },
  [TestRunStatus.Blocked]: {
    icon: testManagement.icon.StatusBlocked,
    label: testManagement.string.StatusBlocked
  },
  [TestRunStatus.Passed]: {
    icon: testManagement.icon.StatusPassed,
    label: testManagement.string.StatusPassed
  },
  [TestRunStatus.Failed]: {
    icon: testManagement.icon.StatusFailed,
    label: testManagement.string.StatusFailed
  }
}
