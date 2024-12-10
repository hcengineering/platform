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

import { Attachment } from '@hcengineering/attachment'
import { Employee } from '@hcengineering/contact'
import {
  Doc,
  type CollectionSize,
  type Ref,
  type Markup,
  TypedSpace,
  MarkupBlobRef,
  AttachedDoc,
  Timestamp
} from '@hcengineering/core'
import { IconProps } from '@hcengineering/view'

/** @public */
export enum TestCaseType {
  Functional,
  Performance,
  Regression,
  Security,
  Smoke,
  Usability
}

/** @public */
export const testCaseTypes = [
  TestCaseType.Functional,
  TestCaseType.Performance,
  TestCaseType.Regression,
  TestCaseType.Security,
  TestCaseType.Smoke,
  TestCaseType.Usability
]

/** @public */
export enum TestCasePriority {
  Low,
  Medium,
  High,
  Urgent
}

/** @public */
export const testCasePriorities = [
  TestCasePriority.Low,
  TestCasePriority.Medium,
  TestCasePriority.High,
  TestCasePriority.Urgent
]

/** @public */
export enum TestCaseStatus {
  Draft,
  ReadyForReview,
  FixReviewComments,
  Approved,
  Rejected
}

/** @public */
export interface TestProject extends TypedSpace, IconProps {
  fullDescription?: Markup
}

/** @public */
export interface TestSuite extends Doc {
  space: Ref<TestProject>
  name: string
  description?: string
  parent: Ref<TestSuite>
  testCases?: CollectionSize<TestCase>
}

/** @public */
export interface TestCase extends AttachedDoc<TestSuite, 'testCases', TestProject> {
  name: string
  description: MarkupBlobRef | null
  type: TestCaseType
  priority: TestCasePriority
  status: TestCaseStatus
  assignee: Ref<Employee>
  attachments?: CollectionSize<Attachment>
  comments?: number
}

/** @public */
export interface TestRun extends Doc {
  name: string
  description: MarkupBlobRef | null
  dueDate?: Timestamp
  results?: CollectionSize<TestResult>
}

/** @public */
export enum TestRunStatus {
  Untested,
  Blocked,
  Passed,
  Failed
}

// TODO: Refactor to associations
/** @public */
export interface TestResult extends AttachedDoc<TestRun, 'results', TestProject> {
  name: string
  testCase: Ref<TestCase>
  testSuite?: Ref<TestSuite>
  status?: TestRunStatus
  description: MarkupBlobRef | null
  assignee?: Ref<Employee>
  attachments?: CollectionSize<Attachment>
  comments?: number
}

/** @public */
export interface TestPlan extends Doc {
  name: string
  description: MarkupBlobRef | null
  items?: CollectionSize<TestPlanItem>
}

/** @public */
export interface TestPlanItem extends AttachedDoc<TestPlan, 'items', TestProject> {
  testCase: Ref<TestCase>
  testSuite?: Ref<TestSuite>
  assignee?: Ref<Employee>
}
