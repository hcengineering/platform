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
  FullTextSearchContext,
  generateId,
  Hierarchy,
  IndexStageState,
  isFullTextAttribute,
  Obj,
  Ref,
  Space,
  Storage,
  TxFactory
} from '@hcengineering/core'
import { deepEqual } from 'fast-equals'
import plugin from '../plugin'
import { FullTextPipeline } from './types'
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

export { docKey, docUpdKey, extractDocKey, isFullTextAttribute } from '@hcengineering/core'
export type { IndexKeyOptions } from '@hcengineering/core'

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

  let result = true

  if (attrs.length === 0 && !(getFullTextContext(hierarchy, c)?.forceIndex ?? false)) {
    result = false
    // We need check if document has collections with indexable fields.
    const attrs = hierarchy.getAllAttributes(c).values()
    for (const attr of attrs) {
      if (attr.type._class === core.class.Collection) {
        if (isClassIndexable(hierarchy, (attr.type as Collection<AttachedDoc>).of)) {
          result = true
          break
        }
      }
    }
  }
  hierarchy.setClassifierProp(c, 'class_indexed', result)
  return result
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

/**
 * @public
 */
export async function loadIndexStageStage (
  storage: Storage,
  state: IndexStageState | undefined,
  stageId: string,
  field: string,
  newValue: any
): Promise<[boolean | string, IndexStageState]> {
  if (state === undefined) {
    ;[state] = await storage.findAll(core.class.IndexStageState, { stageId })
  }
  const attributes: Record<string, any> = state?.attributes ?? {}

  let result: boolean | string | undefined = attributes?.index !== undefined ? `${attributes?.index as number}` : true

  if (!deepEqual(attributes[field], newValue)) {
    // Not match,
    const newIndex = ((attributes.index as number) ?? 0) + 1
    result = `${newIndex}`

    const ops = new TxFactory(core.account.System, true)
    const data = {
      stageId,
      attributes: {
        [field]: newValue,
        index: newIndex
      }
    }
    if (state === undefined) {
      const id: Ref<IndexStageState> = generateId()
      await storage.tx(ops.createTxCreateDoc(core.class.IndexStageState, plugin.space.DocIndexState, data, id))
      state = {
        ...data,
        _class: core.class.IndexStageState,
        _id: id,
        space: plugin.space.DocIndexState,
        modifiedBy: core.account.System,
        modifiedOn: Date.now()
      }
    } else {
      await storage.tx(ops.createTxUpdateDoc(core.class.IndexStageState, plugin.space.DocIndexState, state._id, data))
      state = { ...state, ...data, modifiedOn: Date.now() }
    }
  }
  return [result, state]
}

/**
 * @public
 */
export function getFullTextContext (
  hierarchy: Hierarchy,
  objectClass: Ref<Class<Doc>>
): Omit<FullTextSearchContext, keyof Class<Doc>> {
  let objClass = hierarchy.getClass(objectClass)

  while (true) {
    if (hierarchy.hasMixin(objClass, core.mixin.FullTextSearchContext)) {
      const ctx = hierarchy.as<Class<Doc>, FullTextSearchContext>(objClass, core.mixin.FullTextSearchContext)
      if (ctx !== undefined) {
        return ctx
      }
    }
    if (objClass.extends === undefined) {
      break
    }
    objClass = hierarchy.getClass(objClass.extends)
  }
  return {
    fullTextSummary: false,
    forceIndex: false,
    propagate: []
  }
}

/**
 * @public
 */
export function traverseFullTextContexts (
  pipeline: FullTextPipeline,
  objectClass: Ref<Class<Doc>>,
  op: (ftc: Omit<FullTextSearchContext, keyof Class<Doc>>) => void
): Ref<Class<Doc>>[] {
  const desc = new Set(pipeline.hierarchy.getDescendants(objectClass))
  const propagate = new Set<Ref<Class<Doc>>>()

  const ftContext = getFullTextContext(pipeline.hierarchy, objectClass)
  if (ftContext !== undefined) {
    op(ftContext)
  }

  // Add all parent mixins as well
  for (const a of pipeline.hierarchy.getAncestors(objectClass)) {
    const ftContext = getFullTextContext(pipeline.hierarchy, a)
    if (ftContext !== undefined) {
      op(ftContext)
    }
    const dsca = pipeline.hierarchy.getDescendants(a)
    for (const dd of dsca) {
      if (pipeline.hierarchy.isMixin(dd)) {
        desc.add(dd)
      }
    }
  }

  for (const d of desc) {
    if (pipeline.hierarchy.isMixin(d)) {
      const mContext = getFullTextContext(pipeline.hierarchy, d)
      if (mContext !== undefined) {
        op(mContext)
      }
    }
  }
  return Array.from(propagate.values())
}

/**
 * @public
 */
export function collectPropagate (pipeline: FullTextPipeline, objectClass: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
  const propagate = new Set<Ref<Class<Doc>>>()
  traverseFullTextContexts(pipeline, objectClass, (fts) => fts?.propagate?.forEach((it) => propagate.add(it)))

  return Array.from(propagate.values())
}

/**
 * @public
 */
export function collectPropagateClasses (pipeline: FullTextPipeline, objectClass: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
  const propagate = new Set<Ref<Class<Doc>>>()
  traverseFullTextContexts(pipeline, objectClass, (fts) => fts?.propagateClasses?.forEach((it) => propagate.add(it)))

  return Array.from(propagate.values())
}
