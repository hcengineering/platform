//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { generateId, type Data, type Ref } from '@hcengineering/core'
import productsPlugin, { ProductVersionState, type Product, type ProductVersion } from '@hcengineering/products'

import { type CustomExportHandler } from '../workspace/types'

/**
 * Custom export handler that consolidates all source ProductVersions of a
 * given Product onto a single 1.0.0 ProductVersion in the target Product.
 */
export function createProductVersionHandler (): CustomExportHandler {
  const cache = new Map<Ref<Product>, Ref<ProductVersion>>()

  return {
    class: productsPlugin.class.ProductVersion,
    resolve: async (sourceDoc, ctx) => {
      const sourceVersion = sourceDoc as ProductVersion
      const targetSpace = await ctx.spaceExporter.getOrCreateTargetSpace(
        sourceVersion.space,
        ctx.sourceHierarchy,
        ctx.sourceLowLevel
      )
      const targetProductId = targetSpace as Ref<Product>

      const cached = cache.get(targetProductId)
      if (cached !== undefined) {
        ctx.context.info(`Mapping source ProductVersion ${sourceVersion._id} onto cached target 1.0.0 ${cached}`)
        return cached
      }

      const existing = await ctx.targetClient.findOne(productsPlugin.class.ProductVersion, {
        space: targetProductId,
        major: 1,
        minor: 0,
        patch: 0
      })

      let targetVersionId: Ref<ProductVersion>

      if (existing !== undefined) {
        targetVersionId = existing._id
        ctx.context.info(
          `Reusing existing 1.0.0 ProductVersion ${targetVersionId} in product ${targetProductId} ` +
            `(source version ${sourceVersion._id})`
        )
      } else {
        targetVersionId = generateId<ProductVersion>()
        const data: Data<ProductVersion> = {
          name: '1.0.0',
          readonly: false,
          major: 1,
          minor: 0,
          patch: 0,
          description: '',
          state: ProductVersionState.Active,
          parent: productsPlugin.ids.NoParentVersion
        }
        await ctx.targetClient.createDoc(productsPlugin.class.ProductVersion, targetProductId, data, targetVersionId)
        ctx.context.info(
          `Created 1.0.0 ProductVersion ${targetVersionId} in product ${targetProductId} ` +
            `(consolidating source version ${sourceVersion._id})`
        )
      }

      cache.set(targetProductId, targetVersionId)
      return targetVersionId
    }
  }
}
