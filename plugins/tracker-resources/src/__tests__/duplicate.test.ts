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

import type { AnyAttribute, Class, Classifier, Doc, Ref } from '@hcengineering/core'
import { getCustomAttributesToCopy, type DuplicateHierarchy } from '../duplicate'

const issueClass = 'tracker:class:Issue' as Ref<Class<Doc>>
const typeMixin = 'task-type:type:mixin' as Ref<Class<Doc>>
const systemMixin = 'sync:mixin:External' as Ref<Class<Doc>>
const emptyMixin = 'custom:mixin:Empty' as Ref<Class<Doc>>
const stringType = 'core:class:TypeString' as any
const collectionType = 'core:class:Collection' as any
const identifierType = 'core:class:TypeIdentifier' as any
const collaborativeDocType = 'core:class:TypeCollaborativeDoc' as any
const excludedTypes = [collectionType, identifierType, collaborativeDocType]

function attr (name: string, isCustom: boolean, type = stringType): AnyAttribute {
  return { name, isCustom, type: { _class: type } } as unknown as AnyAttribute
}

function attrs (...list: AnyAttribute[]): Map<string, AnyAttribute> {
  return new Map(list.map((a) => [a.name, a]))
}

const attributesByClass = new Map<Ref<Classifier>, Map<string, AnyAttribute>>([
  [
    issueClass,
    attrs(
      attr('title', false),
      attr('status', false),
      attr('subIssues', false, collectionType),
      attr('customText', true),
      attr('customEmpty', true),
      attr('customCollection', true, collectionType),
      attr('customIdentifier', true, identifierType),
      attr('customDoc', true, collaborativeDocType)
    )
  ],
  [
    typeMixin,
    attrs(attr('customTypeField', true), attr('customTypeOther', true), attr('customTypeId', true, identifierType))
  ],
  [systemMixin, attrs(attr('externalId', false))],
  [emptyMixin, attrs(attr('customUnset', true))]
])

const hierarchy: DuplicateHierarchy = {
  getAllAttributes: (clazz) => attributesByClass.get(clazz) ?? new Map(),
  findAllMixins: (doc) => [typeMixin, systemMixin, emptyMixin].filter((m) => typeof (doc as any)[m] === 'object')
}

describe('getCustomAttributesToCopy', () => {
  const doc = {
    _id: 'issue-1',
    _class: issueClass,
    title: 'Original',
    status: 'status-1',
    subIssues: 3,
    customText: 'hello',
    customCollection: 2,
    customIdentifier: 'ID-1',
    customDoc: 'blob-1',
    [typeMixin]: { customTypeField: 42, customTypeId: 'ID-2' },
    [systemMixin]: { externalId: 'ext-1' },
    [emptyMixin]: {}
  } as unknown as Doc

  it('copies only custom attributes of the class', () => {
    const result = getCustomAttributesToCopy(hierarchy, doc, issueClass, excludedTypes)
    expect(result.attributes).toEqual({ customText: 'hello' })
  })

  it('copies custom attributes of applied mixins and skips system or empty mixins', () => {
    const result = getCustomAttributesToCopy(hierarchy, doc, issueClass, excludedTypes)
    expect(Array.from(result.mixins.entries())).toEqual([[typeMixin, { customTypeField: 42 }]])
  })

  it('does not copy identifier, collaborative document and collection attributes', () => {
    const result = getCustomAttributesToCopy(hierarchy, doc, issueClass, excludedTypes)
    expect(result.attributes).not.toHaveProperty('customIdentifier')
    expect(result.attributes).not.toHaveProperty('customDoc')
    expect(result.attributes).not.toHaveProperty('customCollection')
    expect(result.mixins.get(typeMixin as any)).not.toHaveProperty('customTypeId')
  })

  it('copies every custom attribute type that is not excluded', () => {
    const result = getCustomAttributesToCopy(hierarchy, doc, issueClass)
    expect(result.attributes).toEqual({
      customText: 'hello',
      customCollection: 2,
      customIdentifier: 'ID-1',
      customDoc: 'blob-1'
    })
  })

  it('keeps falsy but defined values', () => {
    const result = getCustomAttributesToCopy(
      hierarchy,
      { ...doc, customText: '', [typeMixin]: { customTypeField: 0, customTypeOther: null } } as unknown as Doc,
      issueClass,
      excludedTypes
    )
    expect(result.attributes).toEqual({ customText: '' })
    expect(result.mixins.get(typeMixin as any)).toEqual({ customTypeField: 0, customTypeOther: null })
  })

  it('returns nothing for a document without custom values', () => {
    const result = getCustomAttributesToCopy(
      hierarchy,
      { _id: 'issue-2', _class: issueClass, title: 'Plain' } as unknown as Doc,
      issueClass
    )
    expect(result.attributes).toEqual({})
    expect(result.mixins.size).toBe(0)
  })
})
