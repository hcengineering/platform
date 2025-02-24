//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type Domain, IndexKind, type Ref } from '@hcengineering/core'
import { type Category, type Product, type Variant, inventoryId } from '@hcengineering/inventory'
import { type Builder, Collection, Index, Model, Prop, TypeRef, TypeString, UX } from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import core, { TAttachedDoc } from '@hcengineering/model-core'
import { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import setting from '@hcengineering/setting'
import view, { type Viewlet } from '@hcengineering/view'
import chunter from '@hcengineering/model-chunter'
import activity from '@hcengineering/activity'

import inventory from './plugin'
export { inventoryId } from '@hcengineering/inventory'
export { inventoryOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_INVENTORY = 'inventory' as Domain
@Model(inventory.class.Category, core.class.AttachedDoc, DOMAIN_INVENTORY)
@UX(inventory.string.Category, inventory.icon.Categories, undefined, 'name', undefined, inventory.string.Categories)
export class TCategory extends TAttachedDoc implements Category {
  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string
}

@Model(inventory.class.Product, core.class.AttachedDoc, DOMAIN_INVENTORY)
@UX(inventory.string.Product, inventory.icon.Products, undefined, 'name', undefined, inventory.string.Products)
export class TProduct extends TAttachedDoc implements Product {
  // We need to declare, to provide property with label
  @Prop(TypeRef(inventory.class.Category), inventory.string.Category)
  declare attachedTo: Ref<Category>

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(Collection(attachment.class.Photo), attachment.string.Photos)
    photos?: number

  @Prop(Collection(inventory.class.Variant), inventory.string.Variants)
    variants?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number
}

@Model(inventory.class.Variant, core.class.AttachedDoc, DOMAIN_INVENTORY)
@UX(inventory.string.Variant, inventory.icon.Variant, undefined, 'name', undefined, inventory.string.Variants)
export class TVariant extends TAttachedDoc implements Variant {
  // We need to declare, to provide property with label
  @Prop(TypeRef(inventory.class.Product), inventory.string.Product)
  declare attachedTo: Ref<Product>

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), inventory.string.SKU)
  @Index(IndexKind.FullText)
    sku!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TCategory, TProduct, TVariant)

  builder.mixin(inventory.class.Product, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(inventory.class.Category, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(inventory.class.Variant, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: inventory.class.Product,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: inventory.class.Category,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: inventory.class.Variant,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.mixin(inventory.class.Category, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: inventory.component.CategoryPresenter
  })

  builder.mixin(inventory.class.Category, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: inventory.function.CategoryIdProvider
  })

  builder.mixin(inventory.class.Category, core.class.Class, view.mixin.AttributePresenter, {
    presenter: inventory.component.CategoryRefPresenter
  })

  builder.mixin(inventory.class.Product, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: inventory.component.ProductPresenter
  })

  builder.mixin(inventory.class.Product, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: inventory.function.ProductIdProvider
  })

  builder.mixin(inventory.class.Variant, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: inventory.component.VariantPresenter
  })

  builder.mixin(inventory.class.Variant, core.class.Class, view.mixin.CollectionEditor, {
    editor: inventory.component.Variants
  })

  builder.mixin(inventory.class.Product, core.class.Class, view.mixin.ObjectEditor, {
    editor: inventory.component.EditProduct
  })

  builder.mixin(inventory.class.Product, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: inventory.class.Product,
      descriptor: view.viewlet.Table,
      config: ['', 'attachedTo', 'modifiedOn'],
      configOptions: {
        sortable: true
      }
    },
    inventory.viewlet.TableProduct
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: inventory.string.Inventory,
      icon: inventory.icon.InventoryApplication,
      alias: inventoryId,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'Categories',
            label: inventory.string.Categories,
            icon: inventory.icon.Categories,
            component: inventory.component.Categories
          },
          {
            id: 'Products',
            label: inventory.string.Products,
            icon: inventory.icon.Products,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: inventory.class.Product,
              icon: inventory.icon.Products,
              label: inventory.string.Products,
              createLabel: inventory.string.ProductCreateLabel,
              createComponent: inventory.component.CreateProduct
            }
          }
        ],
        spaces: []
      }
    },
    inventory.app.Inventory
  )

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: inventory.string.Inventory, visible: true },
    inventory.category.Inventory
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: inventory.class.Product,
      label: chunter.string.LeftComment
    },
    inventory.ids.ProductChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: inventory.class.Category,
      label: chunter.string.LeftComment
    },
    inventory.ids.CategoryChatMessageViewlet
  )

  createAction(builder, {
    label: inventory.string.CreateSubcategory,
    icon: inventory.icon.Categories,
    action: inventory.actionImpl.CreateSubcategory,
    input: 'focus',
    category: inventory.category.Inventory,
    target: inventory.class.Category,
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
    }
  })

  builder.mixin(inventory.class.Product, core.class.Class, view.mixin.ClassFilters, {
    filters: ['attachedTo']
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_INVENTORY,
    disabled: [
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 },
      { attachedTo: 1 }
    ]
  })
}
