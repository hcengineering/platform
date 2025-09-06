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

import documents, { TExternalSpace, TProject } from '@hcengineering/model-controlled-documents'
import type { Document } from '@hcengineering/controlled-documents'
import type { Product, ProductVersionState, ProductVersion } from '@hcengineering/products'
import { productsId } from '@hcengineering/products'
import activity from '@hcengineering/activity'
import { type Attachment } from '@hcengineering/attachment'
import contact from '@hcengineering/contact'
import chunter from '@hcengineering/chunter'
import { getRoleAttributeProps } from '@hcengineering/setting'
import type { Type, Ref, CollectionSize, Markup, RolesAssignment, Permission, Role } from '@hcengineering/core'
import { IndexKind, AccountUuid } from '@hcengineering/core'
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
  Mixin,
  TypeAccountUuid
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TType } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import tracker from '@hcengineering/model-tracker'
import { type Action } from '@hcengineering/view'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { getEmbeddedLabel, type Asset } from '@hcengineering/platform'

import products from './plugin'
import { roles } from './roles'

export { productsId } from '@hcengineering/products/src/index'

const productPermissions: Ref<Permission>[] = [
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
export function TypeProductVersionState (): Type<ProductVersionState> {
  return { _class: products.class.TypeProductVersionState, label: products.string.ProductVersion }
}

@Model(products.class.TypeProductVersionState, core.class.Type)
@UX(products.string.ProductVersionState)
export class TTypeProductVersionState extends TType {}

@Model(products.class.Product, documents.class.ExternalSpace)
@UX(products.string.Product, products.icon.Product, 'Product', 'name', undefined, products.string.Products)
export class TProduct extends TExternalSpace implements Product {
  @Prop(ArrOf(TypeAccountUuid()), core.string.Members)
  declare members: AccountUuid[]

  @Prop(TypeMarkup(), products.string.Description)
  @Index(IndexKind.FullText)
    fullDescription?: string

  @Prop(TypeString(), products.string.Icon)
  @Index(IndexKind.FullText)
  @Hidden()
    icon?: Asset

  @Prop(TypeNumber(), products.string.Color)
  @Index(IndexKind.FullText)
  @Hidden()
    color?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>
}

@Model(products.class.ProductVersion, documents.class.Project)
@UX(products.string.ProductVersion, products.icon.ProductVersion, undefined, undefined, products.string.ProductVersions)
export class TProductVersion extends TProject implements ProductVersion {
  @Prop(TypeRef(products.class.Product), products.string.Product)
  @Index(IndexKind.Indexed)
  declare space: Ref<Product>

  @Prop(TypeNumber(), products.string.Major)
  @ReadOnly()
    major!: number

  @Prop(TypeNumber(), products.string.Minor)
  @ReadOnly()
    minor!: number

  @Prop(TypeString(), products.string.Codename)
    codename?: string

  @Prop(TypeMarkup(), products.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeRef(products.class.ProductVersion), products.string.ProductVersionParent)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    parent!: Ref<ProductVersion>

  @Prop(TypeProductVersionState(), products.string.ProductVersionState)
  @ReadOnly()
    state!: ProductVersionState

  @Prop(
    TypeAny(
      products.component.ChangeControlInlineEditor,
      products.string.ChangeControl,
      products.component.ChangeControlInlineEditor
    ),
    products.string.ChangeControl
  )
  @ReadOnly()
    changeControl?: Ref<Document>
}

@Mixin(products.mixin.ProductTypeData, products.class.Product)
@UX(getEmbeddedLabel('Default Products'), products.icon.ProductVersion)
export class TProductTypeData extends TProduct implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

function defineProduct (builder: Builder): void {
  builder.createModel(TProduct, TProductTypeData)

  builder.mixin(products.class.Product, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(products.class.Product, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: products.function.ProductIdentifierProvider
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: products.class.Product,
    components: { input: { component: chunter.component.ChatMessageInput } }
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
      availablePermissions: [...productPermissions],
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
    components: { input: { component: chunter.component.ChatMessageInput } }
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
