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

import type { Person } from '@hcengineering/contact'
import documents, { TProject } from '@hcengineering/model-controlled-documents'
import type { TestCase, TestSuite, TestCaseType, TestCasePriority, TestCaseStatus, TestProject } from '@hcengineering/test-management'
import { type Attachment } from '@hcengineering/attachment'
import contact from '@hcengineering/contact'
import chunter from '@hcengineering/chunter'
import type { Type, CollectionSize, Permission, } from '@hcengineering/core'
import { IndexKind, Ref } from '@hcengineering/core'
import {
  type Builder,
  Model,
  Prop,
  TypeRef,
  UX,
  TypeMarkup,
  Index,
  TypeString,
  Collection,
  ReadOnly,
  Mixin
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc, TType } from '@hcengineering/model-core'
import tracker from '@hcengineering/model-tracker'

import testManagement from './plugin'

export { testManagementId } from '@hcengineering/test-management/src/index'

const testManagementPermissions: Ref<Permission>[] = [
  documents.permission.CreateDocument,
  documents.permission.ReviewDocument,
    documents.permission.ApproveDocument,
   documents.permission.CoAuthorDocument,
  	documents.permission.ArchiveDocument,
  documents.permission.UpdateDocumentOwner,
  core.permission.UpdateSpace,
  core.permission.ArchiveSpace
]

/** @public */
export function TypeTestCaseType (): Type<TestCaseType> {
  return { _class: testManagement.class.TypeTestCaseType, label: testManagement.string.TestCaseType }
}

@Model(testManagement.class.TypeTestCaseType, core.class.Type)
@UX(testManagement.string.TestCaseType)
export class TTypeTestCaseType extends TType {}

/** @public */
export function TypeTestCasePriority (): Type<TestCasePriority> {
	return { _class: testManagement.class.TypeTestCasePriority, label: testManagement.string.TestCasePriority }
}

@Model(testManagement.class.TypeTestCasePriority, core.class.Type)
@UX(testManagement.string.TestCasePriority)
export class TTypeTestCasePriority extends TType {}

/** @public */
export function TypeTestCaseStatus (): Type<TestCaseStatus> {
	return { _class: testManagement.class.TypeTestCaseStatus, label: testManagement.string.TestCaseStatus }
}

@Model(testManagement.class.TypeTestCaseStatus, core.class.Type)
@UX(testManagement.string.TestCaseStatus)
export class TTypeTestCaseStatus extends TType {}

@Mixin(testManagement.mixin.TestProject, tracker.class.Project)
@UX(testManagement.string.TestProject)
export class TTestProject extends TProject implements TestProject {
}

/**
 * @public
 */
 @Model(testManagement.class.TestSuite, core.class.AttachedDoc)
 @UX(testManagement.string.TestSuite, testManagement.icon.TestSuite, testManagement.string.TestSuite)
 export class TTestSuite extends TAttachedDoc implements TestCase {
	@Prop(TypeString(), testManagement.string.SuiteName)
	@Index(IndexKind.FullText)
	  name!: string

	@Prop(TypeMarkup(), testManagement.string.SuiteDescription)
    @Index(IndexKind.FullText)
      description?: string

	@Prop(TypeRef(testManagement.class.TestProject), testManagement.string.Suite)
      project!: Ref<TTestProject> | null
 }

/**
 * @public
 */
 @Model(testManagement.class.TestCase, core.class.AttachedDoc)
 @UX(testManagement.string.TestCase, testManagement.icon.TestCase, testManagement.string.TestCase)
 export class TTestCase extends TAttachedDoc implements TestCase {
  @Prop(TypeString(), testManagement.string.TestName)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeMarkup(), testManagement.string.TestDescription)
  @Index(IndexKind.FullText)
    description?: string

  @Prop(TypeTestCaseType(), testManagement.string.Type)
  @ReadOnly()
    type!: TestCaseType

  @Prop(TypeTestCasePriority(), testManagement.string.Priority)
  @ReadOnly()
    priority!: TestCasePriority

  @Prop(TypeTestCaseStatus(), testManagement.string.Status)
  @ReadOnly()
    status!: TestCaseStatus

  @Prop(TypeString(), testManagement.string.EstimatedTime)
    estimatedTime?: number

  @Prop(TypeMarkup(), testManagement.string.Preconditions)
    preconditions?: string

  @Prop(TypeMarkup(), testManagement.string.Preconditions)
    steps?: string

  @Prop(TypeRef(testManagement.class.TestSuite), testManagement.string.Suite)
    suite!: Ref<TestSuite> | null

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.Assignee)
    assignee!: Ref<Person> | null

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
 }



 export function createModel (builder: Builder): void {
 }
 export { testManagementOperation } from './migration'
 export { default } from './plugin'
