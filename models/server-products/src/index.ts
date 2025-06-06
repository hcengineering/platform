//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import type { Plugin } from '@hcengineering/platform'
import products from '@hcengineering/products'

import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import serverCore from '@hcengineering/server-core'

export const serverProductsId = 'server-products' as Plugin

export function createModel (builder: Builder): void {
  builder.mixin(products.class.Product, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: products.component.ProductSearchIcon,
      fields: [['icon'], ['color']]
    },
    title: [['name']]
  })
}
