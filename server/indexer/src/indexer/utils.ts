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

import {
  type AnyAttribute,
  type Class,
  type Doc,
  type FullTextSearchContext,
  getFullTextContext,
  type Hierarchy,
  type Ref,
  type Space
} from '@hcengineering/core'
import { type IndexedDoc } from '@hcengineering/server-core'
import { type FullTextPipeline } from './types'

export { docKey, isFullTextAttribute } from '@hcengineering/core'

/**
 * @public
 */
export function getContent (
  hierarchy: Hierarchy,
  attributes: AnyAttribute[],
  doc: Doc
): Record<string, { value: any, attr: AnyAttribute }> {
  const attrs: Record<string, { value: any, attr: AnyAttribute }> = {}

  for (const attr of attributes) {
    const isMixinAttr = hierarchy.isMixin(attr.attributeOf)
    if (isMixinAttr) {
      const key = (attr.attributeOf as string) + '.' + attr.name
      const value = (doc as any)[attr.attributeOf]?.[attr.name]?.toString() ?? ''
      attrs[key] = { value, attr }
    } else {
      const value = (doc as any)[attr.name]?.toString() ?? ''
      attrs[attr.name] = { value, attr }
    }
  }
  return attrs
}

/**
 * @public
 */
export function traverseFullTextContexts (
  pipeline: FullTextPipeline,
  objectClass: Ref<Class<Doc>>,
  op: (ftc: Omit<FullTextSearchContext, keyof Class<Doc>>) => void
): void {
  const cl = pipeline.hierarchy.getBaseClass(objectClass)
  const ftContext = getFullTextContext(pipeline.hierarchy, cl, pipeline.contexts)
  if (ftContext !== undefined) {
    op(ftContext)
  }
  const dsca = pipeline.hierarchy.getDescendants(cl)
  for (const dd of dsca) {
    const mContext = getFullTextContext(pipeline.hierarchy, dd, pipeline.contexts)
    if (mContext !== undefined) {
      op(mContext)
    }
  }
}

const CUSTOM_ATTR_KEY = 'customAttributes'
const CUSTOM_ATTR_UPDATE_KEY = 'attributes.customAttributes'

/**
 * @public
 */
export function getCustomAttrKeys (): { customAttrKey: string, customAttrUKey: string } {
  return { customAttrKey: CUSTOM_ATTR_KEY, customAttrUKey: CUSTOM_ATTR_UPDATE_KEY }
}

/**
 * @public
 */
export function isCustomAttr (attr: string): boolean {
  return attr === CUSTOM_ATTR_KEY
}
/**
 * @public
 */
export function createIndexedDoc (doc: Doc, mixins: Ref<Class<Doc>>[] | undefined, space: Ref<Space>): IndexedDoc {
  const indexedDoc = {
    id: doc._id,
    _class: [doc._class, ...(mixins ?? [])],
    modifiedBy: doc.modifiedBy,
    modifiedOn: doc.modifiedOn,
    space
  }
  return indexedDoc
}
