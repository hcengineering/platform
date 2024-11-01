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
  TestRun
} from '@hcengineering/test-management'
import { type Attachment } from '@hcengineering/attachment'
import contact from '@hcengineering/contact'
import chunter from '@hcengineering/chunter'
import { getEmbeddedLabel } from '@hcengineering/platform'
import {
  Account,
  IndexKind,
  type RolesAssignment,
  type Role,
  Ref,
  type Domain,
  type Type,
  type CollectionSize,
  type CollaborativeDoc
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
  TypeNumber
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TDoc, TType, TTypedSpace } from '@hcengineering/model-core'

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
  [key: Ref<Role>]: Ref<Account>[]
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

  declare space: Ref<TestProject>
}

/**
 * @public
 */
@Model(testManagement.class.TestCase, core.class.Doc, DOMAIN_TEST_MANAGEMENT)
@UX(testManagement.string.TestCase, testManagement.icon.TestCase, testManagement.string.TestCase)
export class TTestCase extends TDoc implements TestCase {
  @Prop(TypeString(), testManagement.string.TestName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), testManagement.string.FullDescription)
  @Index(IndexKind.FullText)
    description!: CollaborativeDoc

  @Prop(TypeTestCaseType(), testManagement.string.TestType)
  @ReadOnly()
    type!: TestCaseType

  @Prop(TypeTestCasePriority(), testManagement.string.TestPriority)
  @ReadOnly()
    priority!: TestCasePriority

  @Prop(TypeTestCaseStatus(), testManagement.string.TestStatus)
  @ReadOnly()
    status!: TestCaseStatus

  @Prop(TypeNumber(), testManagement.string.TestEstimatedTime)
    estimatedTime!: number

  @Prop(TypeMarkup(), testManagement.string.TestPreconditions)
    preconditions?: string

  @Prop(TypeMarkup(), testManagement.string.TestSteps)
    steps?: string

  @Prop(TypeRef(testManagement.class.TestSuite), testManagement.string.TestSuite)
    suite!: Ref<TestSuite>

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.TestAssignee)
    assignee!: Ref<Employee>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
}

@Model(testManagement.class.TestRun, core.class.Doc)
@UX(testManagement.string.TestRun)
export class TTestRun extends TDoc implements TestRun {}
