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
import documents, { TExternalSpace, TProject } from '@hcengineering/model-controlled-documents'
import type { Document } from '@hcengineering/controlled-documents'
import type { TestCase, TestSuite, TestCaseType, TestCasePriority, TestCaseStatus } from '@hcengineering/test-management'
import { productsId } from '@hcengineering/products'
import activity from '@hcengineering/activity'
import { type Attachment } from '@hcengineering/attachment'
import contact from '@hcengineering/contact'
import chunter from '@hcengineering/chunter'
import { getRoleAttributeProps } from '@hcengineering/setting'
import type { Type, CollectionSize, Markup, Arr, RolesAssignment, Permission, Role } from '@hcengineering/core'
import { IndexKind, Ref, Account } from '@hcengineering/core'
import {
  type Builder,
  Model,
  Prop,
  TypeRef,
  UX,
  TypeMarkup,
  Index,
  TypeString,
  Hidden,
  TypeNumber,
  Collection,
  ArrOf,
  TypeAny,
  ReadOnly,
  Mixin
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc, TType } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import tracker from '@hcengineering/model-tracker'
import { type Action } from '@hcengineering/view'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { getEmbeddedLabel, type Asset } from '@hcengineering/platform'

import testManagement from './plugin'
import { roles } from './roles'

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

  @Prop(TypeRef(TypeTestSuite), testManagement.string.Suite)
    suite!: Ref<TestSuite> | null

  @Prop(TypeRef(contact.mixin.Employee), testManagement.string.Assignee)
    assignee!: Ref<Person> | null

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
 }


function defineTestManagement (builder: Builder): void {
   builder.createModel(TProduct, TProductTypeData)

  	builder.mixin(products.class.Product, core.class.Class, activity.mixin.ActivityDoc, {})

    builder.mixin(products.class.Product, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: products.function.ProductIdentifierProvider
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: products.class.Product,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(products.class.Product, core.class.Class, view.mixin.ObjectEditor, {
    editor: products.component.EditProduct
  })

  builder.mixin(products.class.Product, core.class.Class, view.mixin.ObjectPanel, {
    component: products.component.EditProduct
  })

  builder.mixin(products.class.Product, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: products.component.ProductPresenter
  })

  builder.mixin(products.class.Product, core.class.Class, view.mixin.SpacePresenter, {
    presenter: documents.component.DocumentSpacePresenter
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: products.string.Products,
      icon: products.icon.Product,
      label: products.string.SearchProduct,
      query: products.completion.ProductQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: products.class.Product
    },
    products.completion.ProductQueryCategory
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: products.class.Product,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'archived',
        {
          key: 'owners',
          presenter: contact.component.AccountArrayEditor,
          label: core.string.Owners,
          props: {
            readonly: true,
            size: 'card'
          }
        },
        {
          key: 'members',
          presenter: contact.component.AccountArrayEditor,
          label: core.string.Members,
          props: {
            readonly: true,
            size: 'card'
          }
        },
        'modifiedOn'
      ],
      configOptions: {
        hiddenKeys: ['name'],
        sortable: true,
        strict: true
      }
    },
    products.viewlet.TableProduct
  )

  builder.mixin(products.class.Product, core.class.Class, view.mixin.ClassFilters, {
    filters: ['archived', 'private', 'createdBy'],
    ignoreKeys: ['name', 'type', 'description', 'fullDescription', 'modifiedBy', 'createdOn', 'modifiedOn'],
    getVisibleFilters: products.function.GetVisibleFilters
  })

  builder.mixin(products.class.Product, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.NewRelatedIssue]
  })
}

function defineSpaceType (builder: Builder): void {
  for (const role of roles) {
    const { label, roleType } = getRoleAttributeProps(role.name)

    Prop(roleType, label)(TProductTypeData.prototype, role._id)
  }

  builder.createDoc(
    documents.class.DocumentSpaceTypeDescriptor,
    core.space.Model,
    {
      name: products.string.ProductsApplication,
      description: products.string.ProductsApplication,
      icon: products.icon.ProductsApplication,
      baseClass: products.class.Product,
      availablePermissions: [...testManagementPermissions],
      projectClass: products.class.ProductVersion,
      withProjects: true
    },
    products.spaceTypeDescriptor.ProductType
  )

  builder.createDoc(
    documents.class.DocumentSpaceType,
    core.space.Model,
    {
      name: 'Default Products',
      descriptor: products.spaceTypeDescriptor.ProductType,
      roles: roles.length,
      projects: true,
      targetClass: products.mixin.ProductTypeData
    },
    products.spaceType.ProductType
  )

  for (const role of roles) {
    builder.createDoc(
      core.class.Role,
      core.space.Model,
      {
        attachedTo: products.spaceType.ProductType,
        attachedToClass: documents.class.DocumentSpaceType,
        collection: 'roles',
        name: role.name,
        permissions: role.permissions
      },
      role._id
    )
  }
}

function defineProductVersion (builder: Builder): void {
  builder.createModel(TProductVersion)

  builder.mixin(products.class.ProductVersion, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: products.class.ProductVersion,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.ObjectEditor, {
    editor: products.component.EditProductVersion
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.ObjectPanel, {
    component: products.component.EditProductVersion
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: products.component.ProductVersionPresenter
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: products.component.ProductVersionsPresenter
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.CollectionEditor, {
    editor: products.component.ProductVersionsEditor
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: products.component.ProductVersionInlineEditor
  })

  // builder.createDoc(
  //   presentation.class.ObjectSearchCategory,
  //   core.space.Model,
  //   {
  //     title: products.string.ProductVersions,
  //     icon: products.icon.ProductVersion,
  //     label: products.string.SearchProductVersion,
  //     query: products.completion.ProductVersionQuery,
  //     context: ['search', 'mention', 'spotlight'],
  //     classToSearch: products.class.ProductVersion
  //   },
  //   products.completion.ProductVersionQueryCategory
  // )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: products.class.ProductVersion,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'space',
        'state',
        '$lookup.parent',
        {
          key: '$lookup.space.owners',
          presenter: contact.component.AccountArrayEditor,
          label: core.string.Owners,
          props: {
            readonly: true,
            size: 'card'
          }
        },
        'createdBy',
        'createdOn'
      ],
      configOptions: {
        hiddenKeys: ['attachedTo', 'description', 'readonly'],
        sortable: true
      }
    },
    products.viewlet.TableProductVersion
  )

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.ClassFilters, {
    filters: ['space', 'name', 'parent', 'state'],
    ignoreKeys: ['createdBy', 'modifiedBy', 'createdOn', 'modifiedOn']
  })

  builder.mixin(products.class.ProductVersion, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.NewRelatedIssue, documents.action.CreateDocument as Ref<Action>]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.Delete,
      label: view.string.Delete,
      icon: view.icon.Delete,
      visibilityTester: products.function.CanDeleteProductVersion,
      category: view.category.General,
      input: 'any',
      target: products.class.ProductVersion,
      context: { mode: ['context', 'browser'], group: 'remove' },
      override: [view.action.Delete]
    },
    products.action.DeleteProductVersion
  )
}

function defineProductVersionState (builder: Builder): void {
  builder.createModel(TTypeProductVersionState)

  builder.mixin(products.class.TypeProductVersionState, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: products.component.ProductVersionStateEditor
  })

  builder.mixin(products.class.TypeProductVersionState, core.class.Class, view.mixin.AttributePresenter, {
    presenter: products.component.ProductVersionStatePresenter
  })

  builder.mixin(products.class.TypeProductVersionState, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: products.string.ProductsApplication,
      icon: products.icon.ProductsApplication,
      alias: productsId,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: 'products',
            label: products.string.Products,
            icon: products.icon.Product,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: products.class.Product,
              icon: products.icon.Product,
              label: products.string.Products
            },
            position: 'top'
          },
          {
            id: 'product-versions',
            label: products.string.ProductVersions,
            icon: products.icon.ProductVersion,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: products.class.ProductVersion,
              icon: products.icon.ProductVersion,
              label: products.string.ProductVersions
            },
            position: 'top'
          }
        ]
      },
      navHeaderComponent: products.component.NewProductHeader
    },
    products.app.Products
  )
}

export function createModel (builder: Builder): void {
  defineSpaceType(builder)
  defineProduct(builder)
  defineProductVersion(builder)
  defineProductVersionState(builder)
  defineApplication(builder)
}

export { productsOperation } from './migration'
export { default } from './plugin'
