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

import type { AttributeModel } from '@hcengineering/view'
import cardPlugin, { type Card } from '@hcengineering/card'
import { ClassifierKind, type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { isTagsColumn, formatCardTagsForMarkdown, formatTagValue } from '../tagFormatter'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    translate: jest.fn(async (str: unknown) => String(str))
  }
})

describe('tagFormatter.isTagsColumn', () => {
  it('returns true for Tags column with empty key and Tags label', () => {
    const attr = {
      key: '',
      sortingKey: '',
      _class: '69659920d7268020fb69db86',
      label: 'card:string:Tags',
      props: {
        showType: false
      },
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    expect(isTagsColumn(attr)).toBe(true)
  })

  it('returns true for explicit tags key', () => {
    const attr = {
      key: 'tags',
      sortingKey: 'tags',
      _class: 'card:class:Card',
      label: 'card:string:Tags',
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    expect(isTagsColumn(attr)).toBe(true)
  })

  it('returns true for lookup-attached tags column', () => {
    const attr = {
      key: '$lookup.attachedTo',
      sortingKey: '',
      _class: 'card:class:Card',
      label: 'card:string:Tags',
      displayProps: {
        key: 'tags'
      },
      collectionAttr: false,
      isLookup: true
    } as unknown as AttributeModel

    expect(isTagsColumn(attr)).toBe(true)
  })

  it('returns false for non-tags attribute', () => {
    const attr = {
      key: 'title',
      sortingKey: 'title',
      _class: 'card:class:Card',
      label: 'card:string:Title',
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    expect(isTagsColumn(attr)).toBe(false)
  })
})

describe('tagFormatter.formatCardTagsForMarkdown', () => {
  it('formats card tags as comma-separated labels', async () => {
    const card = {
      _class: cardPlugin.class.Card
    } as unknown as Card

    const getParentClass = jest.fn(() => 'parent:class:Card')
    const getDescendants = jest.fn(() => ['mixin:TagA', 'mixin:TagB'])
    const getClass = jest.fn((ref: Ref<Class<Doc>>) => {
      if (ref === 'mixin:TagA') {
        return { _id: ref, kind: ClassifierKind.MIXIN, label: 'Tag A' }
      }
      if (ref === 'mixin:TagB') {
        return { _id: ref, kind: ClassifierKind.MIXIN, label: 'Tag B' }
      }
      return { _id: ref, kind: ClassifierKind.CLASS, label: 'Other' }
    })

    const hierarchy = {
      getParentClass,
      getDescendants,
      getClass,
      hasMixin: () => true
    } as unknown as Hierarchy

    const result = await formatCardTagsForMarkdown(card, hierarchy, 'en')
    expect(result).toBe('Tag A, Tag B')
    expect(getParentClass).toHaveBeenCalledWith(card._class)
  })
})

describe('tagFormatter.formatTagValue', () => {
  it('uses card tag formatter when called for card tags column', async () => {
    const card = {
      _class: cardPlugin.class.Card
    } as unknown as Card

    const attr = {
      key: 'tags',
      sortingKey: 'tags',
      _class: 'card:class:Card',
      label: 'card:string:Tags',
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const hierarchy = {
      isDerived: jest.fn((cls: Ref<Class<Doc>>, target: Ref<Class<Doc>>) => cls === target),
      getParentClass: jest.fn(() => 'parent:class:Card'),
      getDescendants: jest.fn(() => ['mixin:TagA']),
      getClass: jest.fn((ref: Ref<Class<Doc>>) => ({
        _id: ref,
        kind: ClassifierKind.MIXIN,
        label: 'Tag A'
      })),
      hasMixin: jest.fn(() => true)
    } as unknown as Hierarchy

    const result = await formatTagValue(attr, card as unknown as Doc, hierarchy, card._class as Ref<Class<Doc>>, 'en')
    expect(result).toBe('Tag A')
  })

  it('formats Tag-derived doc by title when not a tags column', async () => {
    const tagDoc = {
      _class: cardPlugin.class.Tag,
      title: 'Important'
    } as unknown as Doc

    const attr = {
      key: 'title',
      sortingKey: 'title',
      _class: cardPlugin.class.Tag,
      label: 'card:string:TagTitle',
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const hierarchy = {
      isDerived: jest.fn((cls: Ref<Class<Doc>>, target: Ref<Class<Doc>>) => cls === target)
    } as unknown as Hierarchy

    const result = await formatTagValue(attr, tagDoc, hierarchy, tagDoc._class as any, 'en')
    expect(result).toBe('Important')
  })
})
