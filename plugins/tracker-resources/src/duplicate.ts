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

import type { AnyAttribute, Class, Classifier, Doc, Mixin, Ref, Type } from '@hcengineering/core'

/**
 * Subset of Hierarchy used to pick the attributes copied on duplication.
 * @public
 */
export interface DuplicateHierarchy {
  getAllAttributes: (clazz: Ref<Classifier>, to?: Ref<Classifier>) => Map<string, AnyAttribute>
  findAllMixins: (doc: Doc) => Array<Ref<Class<Doc>>>
}

/**
 * Values of user defined attributes of a document, split into plain class
 * attributes and attributes stored in mixins.
 * @public
 */
export interface CopiedCustomAttributes {
  attributes: Record<string, any>
  mixins: Map<Ref<Mixin<Doc>>, Record<string, any>>
}

function pickCustomValues (
  source: Record<string, any> | undefined,
  attributes: Map<string, AnyAttribute>,
  excludedTypes: Set<Ref<Class<Type<any>>>>
): Record<string, any> {
  const result: Record<string, any> = {}
  if (source == null) return result
  for (const [name, attr] of attributes) {
    if (attr.isCustom !== true || excludedTypes.has(attr.type._class)) continue
    const value = source[name]
    if (value === undefined) continue
    result[name] = value
  }
  return result
}

/**
 * Collect user defined (custom) attribute values of a document, so they could be
 * copied to a duplicate. System attributes are never returned, as well as
 * attributes of excluded types (for example collections).
 *
 * @param doc - plain document (not a mixin proxy)
 * @param _class - document class
 * @public
 */
export function getCustomAttributesToCopy (
  hierarchy: DuplicateHierarchy,
  doc: Doc,
  _class: Ref<Class<Doc>>,
  excludedTypes: Array<Ref<Class<Type<any>>>> = []
): CopiedCustomAttributes {
  const excluded = new Set(excludedTypes)
  const attributes = pickCustomValues(doc as any, hierarchy.getAllAttributes(_class), excluded)

  const mixins = new Map<Ref<Mixin<Doc>>, Record<string, any>>()
  for (const mixin of hierarchy.findAllMixins(doc)) {
    const values = pickCustomValues((doc as any)[mixin], hierarchy.getAllAttributes(mixin, _class), excluded)
    if (Object.keys(values).length > 0) {
      mixins.set(mixin as Ref<Mixin<Doc>>, values)
    }
  }
  return { attributes, mixins }
}
