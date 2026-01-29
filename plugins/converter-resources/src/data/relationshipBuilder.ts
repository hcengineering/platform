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

import type { Class, Client, Doc, Hierarchy, Ref } from '@hcengineering/core'
import type { AttributeModel } from '@hcengineering/view'
import { buildConfigAssociation, buildConfigLookup } from '@hcengineering/view-resources'
import type { RelationshipCellModel, RelationshipRowModel } from '../types'

/**
 * Rebuild relationship table viewModel from documents and metadata
 * Recreates the hierarchical structure with row spans and separate rows for each associated child
 */
export async function rebuildRelationshipTableViewModel (
  docs: Doc[],
  model: AttributeModel[],
  cardClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  client: Client
): Promise<RelationshipRowModel[]> {
  const viewModel: RelationshipRowModel[] = []

  const config = model.map((m) => m.key)
  const associations = buildConfigAssociation(config)
  const lookup = buildConfigLookup(hierarchy, cardClass, config)

  const associationAttrs = model.filter((attr) => attr.key.startsWith('$associations'))

  let docsWithAssociations: Doc[] = docs
  if (associations !== undefined && associations.length > 0) {
    const docIds = docs.map((d) => d._id)
    const query = { _id: { $in: docIds } }
    docsWithAssociations = await client.findAll(cardClass, query, { lookup, associations })
  }

  for (const parentDoc of docsWithAssociations) {
    const docWithAssoc = parentDoc as any
    const parentAssociations = docWithAssoc.$associations ?? {}

    let maxChildren = 0
    for (const assocAttr of associationAttrs) {
      const assocKey = assocAttr.key.replace('$associations.', '')
      const children = parentAssociations[assocKey]
      if (Array.isArray(children)) {
        maxChildren = Math.max(maxChildren, children.length)
      } else if (children !== undefined && children !== null) {
        maxChildren = Math.max(maxChildren, 1)
      }
    }

    if (maxChildren === 0) {
      const cells: RelationshipCellModel[] = []
      for (const attr of model) {
        const isAssociationKey = attr.key.startsWith('$associations')
        cells.push({
          attribute: attr,
          rowSpan: 1,
          object: isAssociationKey ? undefined : parentDoc,
          parentObject: isAssociationKey ? parentDoc : undefined
        })
      }
      viewModel.push({ cells })
      continue
    }

    for (let childIndex = 0; childIndex < maxChildren; childIndex++) {
      const cells: RelationshipCellModel[] = []

      for (const attr of model) {
        const isAssociationKey = attr.key.startsWith('$associations')

        if (attr.key === '') {
          cells.push({
            attribute: attr,
            rowSpan: maxChildren,
            object: parentDoc,
            parentObject: undefined
          })
        } else if (isAssociationKey) {
          const assocKey = attr.key.replace('$associations.', '')
          const children = parentAssociations[assocKey]
          let childDoc: Doc | undefined
          if (Array.isArray(children) && children.length > childIndex) {
            childDoc = children[childIndex] as Doc
          } else if (!Array.isArray(children) && children !== undefined && children !== null && childIndex === 0) {
            childDoc = children as Doc
          }

          cells.push({
            attribute: attr,
            rowSpan: 1,
            object: childDoc,
            parentObject: parentDoc
          })
        } else {
          cells.push({
            attribute: attr,
            rowSpan: 1,
            object: childIndex === 0 ? parentDoc : undefined,
            parentObject: undefined
          })
        }
      }

      viewModel.push({ cells })
    }
  }

  return viewModel
}
