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

import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  ClassifierKind,
  Collection,
  Data,
  Doc,
  DocIndexState,
  DOMAIN_BLOB,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  Hierarchy,
  isFullTextAttribute,
  Obj,
  Ref,
  Space
} from '@hcengineering/core'
import plugin from '../plugin'
/**
 * @public
 */
export function getFullTextAttributes (hierarchy: Hierarchy, clazz: Ref<Class<Obj>>): AnyAttribute[] {
  const allAttributes = hierarchy.getAllAttributes(clazz)
  const result: AnyAttribute[] = []
  for (const [, attr] of allAttributes) {
    if (isFullTextAttribute(attr)) {
      result.push(attr)
    }
  }

  hierarchy
    .getDescendants(clazz)
    .filter((m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN)
    .forEach((m) => {
      for (const [, v] of hierarchy.getAllAttributes(m, clazz)) {
        if (isFullTextAttribute(v)) {
          result.push(v)
        }
      }
    })
  return result
}

export { docKey, docUpdKey, extractDocKey, IndexKeyOptions, isFullTextAttribute } from '@hcengineering/core'

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
export function isClassIndexable (hierarchy: Hierarchy, c: Ref<Class<Doc>>): boolean {
  const indexed = hierarchy.getClassifierProp(c, 'class_indexed')
  if (indexed !== undefined) {
    return indexed as boolean
  }
  const domain = hierarchy.findDomain(c)
  if (domain === undefined) {
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }

  if (
    domain === DOMAIN_DOC_INDEX_STATE ||
    domain === DOMAIN_TX ||
    domain === DOMAIN_MODEL ||
    domain === DOMAIN_BLOB ||
    domain === DOMAIN_FULLTEXT_BLOB ||
    domain === DOMAIN_TRANSIENT
  ) {
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }
  const attrs = getFullTextAttributes(hierarchy, c)
  for (const d of hierarchy.getDescendants(c)) {
    if (hierarchy.isMixin(d)) {
      attrs.push(...getFullTextAttributes(hierarchy, d))
    }
  }

  if (attrs.length === 0) {
    // We need check if document has collections with indexable fields.
    const attrs = hierarchy.getAllAttributes(c).values()
    for (const attr of attrs) {
      if (attr.type._class === core.class.Collection) {
        if (isClassIndexable(hierarchy, (attr.type as Collection<AttachedDoc>).of)) {
          hierarchy.setClassifierProp(c, 'class_indexed', true)
          return true
        }
      }
    }

    // No need, since no indixable fields or attachments.
    hierarchy.setClassifierProp(c, 'class_indexed', false)
    return false
  }
  hierarchy.setClassifierProp(c, 'class_indexed', true)
  return true
}
/**
 * @public
 */
export function createStateDoc (
  id: Ref<Doc>,
  objectClass: Ref<Class<Obj>>,
  data: Omit<Data<DocIndexState>, 'objectClass'> & { space?: Ref<Space> }
): DocIndexState {
  return {
    _class: core.class.DocIndexState,
    _id: id as Ref<DocIndexState>,
    space: data.space ?? plugin.space.DocIndexState,
    objectClass,
    modifiedBy: core.account.System,
    modifiedOn: Date.now(),
    ...data
  }
}
