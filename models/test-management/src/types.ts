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

import type { Employee } from '@hcengineering/contact'
import type {
  TestCase,
  TestSuite,
  TestCaseType,
  TestCasePriority,
  TestCaseStatus,
  TestProject,
  TestRun,
  TestRunStatus,
  TestResult,
  TestPlan,
  TestPlanItem
} from '@hcengineering/test-management'
import { type Attachment } from '@hcengineering/attachment'
import contact from '@hcengineering/contact'
import chunter from '@hcengineering/chunter'
import { getEmbeddedLabel } from '@hcengineering/platform'
import {
  DateRangeMode,
  IndexKind,
  type RolesAssignment,
  type Role,
  type Ref,
  type Domain,
  type Timestamp,
  type Type,
  type CollectionSize,
  type MarkupBlobRef,
  type Class,
  type AccountUuid
} from '@hcengineering/core'
import {
  Mixin,
  Model,
  Prop,
  TypeRef,
  UX,
  TypeMarkup,
  Index,
  TypeCollaborativeDoc,
  TypeString,
  Collection,
  ReadOnly,
  TypeDate,
  Hidden
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc, TDoc, TType, TTypedSpace } from '@hcengineering/model-core'

import testManagement from './plugin'

export { testManagementId } from '@hcengineering/test-management/src/index'

export const DOMAIN_TEST_MANAGEMENT = 'test-management' as Domain

/** @public */
export function TypeTestCaseType (): Type<TestCaseType> {
  return { _class: testManagement.class.TypeTestCaseType, label: testManagement.string.TestCaseType }
}

@Model(testManagement.class.TypeTestCaseType, core.class.Type, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCaseType)
export class TTypeTestCaseType extends TType {}

/** @public */
export function TypeTestCasePriority (): Type<TestCasePriority> {
  return { _class: testManagement.class.TypeTestCasePriority, label: testManagement.string.TestCasePriority }
}

@Model(testManagement.class.TypeTestCasePriority, core.class.Type, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCasePriority)
export class TTypeTestCasePriority extends TType {}

/** @public */
export function TypeTestCaseStatus (): Type<TestCaseStatus> {
  return { _class: testManagement.class.TypeTestCaseStatus, label: testManagement.string.TestCaseStatus }
}

@Model(testManagement.class.TypeTestCaseStatus, core.class.Type, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCaseStatus)
export class TTypeTestCaseStatus extends TType {}

@Model(testManagement.class.TestProject, core.class.TypedSpace)
@UX(testManagement.string.TestProject)
export class TTestProject extends TTypedSpace implements TestProject {
  @Prop(TypeMarkup(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    fullDescription?: string
}

@Mixin(testManagement.mixin.DefaultProjectTypeData, testManagement.class.TestProject)
@UX(getEmbeddedLabel('Default project'), testManagement.icon.TestProject)
export class TDefaultProjectTypeData extends TTestProject implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

/**
 * @public
 */
@Model(testManagement.class.TestSuite, core.class.Doc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestSuite, testManagement.icon.TestSuite, testManagement.string.TestSuite)
export class TTestSuite extends TDoc implements TestSuite {
  @Prop(TypeString(), testManagement.string.SuiteName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeMarkup(), testManagement.string.SuiteDescription)
  @Index(IndexKind.FullText)
    description?: string

  @Prop(TypeRef(testManagement.class.TestSuite), testManagement.string.TestSuite)
    parent!: Ref<TestSuite>

  @Prop(Collection(testManagement.class.TestCase), testManagement.string.TestCases, {
    shortLabel: testManagement.string.TestCase
  })
    testCases?: CollectionSize<TestCase>

  declare space: Ref<TestProject>
}

/**
 * @public
 */
@Model(testManagement.class.TestCase, core.class.AttachedDoc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCase, testManagement.icon.TestCase, testManagement.string.TestCase)
export class TTestCase extends TAttachedDoc implements TestCase {
  @Prop(TypeRef(testManagement.class.TestProject), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TestProject>

  @Prop(TypeRef(testManagement.class.TestSuite), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<TestSuite>

  @Prop(TypeRef(testManagement.class.TestSuite), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<TestSuite>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'testCases' = 'testCases'

  @Prop(TypeString(), testManagement.string.TestName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    description!: MarkupBlobRef | null

  @Prop(TypeTestCaseType(), testManagement.string.TestType)
  @ReadOnly()
    type!: TestCaseType

  @Prop(TypeTestCasePriority(), testManagement.string.TestPriority)
  @ReadOnly()
    priority!: TestCasePriority

  @Prop(TypeTestCaseStatus(), testManagement.string.TestStatus)
  @ReadOnly()
    status!: TestCaseStatus

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.TestAssignee)
    assignee!: Ref<Employee>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
}

@Model(testManagement.class.TestRun, core.class.Doc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestRun)
export class TTestRun extends TDoc implements TestRun {
  @Prop(TypeString(), testManagement.string.TestRunName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    description!: MarkupBlobRef | null

  @Prop(TypeDate(DateRangeMode.DATETIME), testManagement.string.DueDate)
    dueDate?: Timestamp

  @Prop(Collection(testManagement.class.TestResult), testManagement.string.TestResult, {
    shortLabel: testManagement.string.TestResult
  })
    results?: CollectionSize<TestResult>
}

/** @public */
export function TypeTestRunStatus (): Type<TestRunStatus> {
  return { _class: testManagement.class.TypeTestRunStatus, label: testManagement.string.TestRunStatus }
}

@Model(testManagement.class.TypeTestRunStatus, core.class.Type, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestRunStatus)
export class TTypeTestRunStatus extends TType {}

// TODO: Refactor to associations
@Model(testManagement.class.TestResult, core.class.AttachedDoc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestResult)
export class TTestResult extends TAttachedDoc implements TestResult {
  @Prop(TypeRef(testManagement.class.TestRun), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<TestRun>

  @Prop(TypeRef(testManagement.class.TestRun), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<TestRun>>

  @Prop(TypeRef(testManagement.class.TestProject), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TestProject>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'results' = 'results'

  @Prop(TypeString(), testManagement.string.TestRunName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    description!: MarkupBlobRef | null

  @Prop(TypeRef(testManagement.class.TestCase), testManagement.string.TestCase)
    testCase!: Ref<TestCase>

  @Prop(TypeRef(testManagement.class.TestSuite), testManagement.string.TestSuite)
  @Index(IndexKind.Indexed)
    testSuite?: Ref<TestSuite>

  @Prop(TypeTestRunStatus(), testManagement.string.TestRunStatus)
  @Index(IndexKind.Indexed)
    status?: TestRunStatus

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.TestAssignee)
  @Index(IndexKind.Indexed)
    assignee?: Ref<Employee>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
}

@Model(testManagement.class.TestPlan, core.class.Doc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestPlan)
export class TTestPlan extends TDoc implements TestPlan {
  @Prop(TypeString(), testManagement.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    description!: MarkupBlobRef | null

  @Prop(Collection(testManagement.class.TestPlanItem), testManagement.string.TestCase, {
    shortLabel: testManagement.string.TestCase
  })
    results?: CollectionSize<TestPlanItem>
}

@Model(testManagement.class.TestPlanItem, core.class.AttachedDoc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCase)
export class TTestPlanItem extends TAttachedDoc implements TestPlanItem {
  @Prop(TypeRef(testManagement.class.TestPlan), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<TestPlan>

  @Prop(TypeRef(testManagement.class.TestPlan), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<TestPlan>>

  @Prop(TypeRef(testManagement.class.TestProject), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TestProject>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'items' = 'items'

  @Prop(TypeRef(testManagement.class.TestCase), testManagement.string.TestCase)
    testCase!: Ref<TestCase>

  @Prop(TypeRef(testManagement.class.TestSuite), testManagement.string.TestSuite)
  @Index(IndexKind.Indexed)
    testSuite?: Ref<TestSuite>

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.TestAssignee)
  @Index(IndexKind.Indexed)
    assignee?: Ref<Employee>
}
