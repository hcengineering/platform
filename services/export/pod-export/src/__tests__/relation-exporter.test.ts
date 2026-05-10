/* eslint-disable @typescript-eslint/unbound-method */
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

import {
  Class,
  type Doc,
  type Hierarchy,
  type LowLevelStorage,
  MeasureMetricsContext,
  type Ref,
  type Space
} from '@hcengineering/core'
import { RelationExporter } from '../workspace/relation-exporter'
import type { ExportState, RelationDefinition } from '../workspace/types'

const spaceId = '69286daacb49b698d3ea2c51' as Ref<Space>
const classParent = 'test:class:ParentDoc' as Ref<Class<Doc>>
const classChild = 'test:class:ChildDoc' as Ref<Class<Doc>>
const classUnrelated = 'test:class:UnrelatedDoc' as Ref<Class<Doc>>
const classTarget = 'test:class:TargetDoc' as Ref<Class<Doc>>

function doc (id: string, _class: Ref<Class<Doc>>, extra: Record<string, any> = {}): Doc {
  return {
    _id: id as Ref<Doc>,
    _class,
    space: spaceId,
    modifiedOn: 0,
    modifiedBy: 'test:account:user' as any,
    ...extra
  }
}

function hierarchyWithDerivation (childDerivesParent: boolean): Hierarchy {
  return {
    findDomain: jest.fn((classRef: Ref<Class<Doc>>) => `domain:${String(classRef)}`),
    isDerived: jest.fn((cls: Ref<Class<Doc>>, base: Ref<Class<Doc>>) => {
      if (cls === base) return true
      if (childDerivesParent && cls === classChild && base === classParent) return true
      return false
    }),
    getAllAttributes: jest.fn(() => new Map()),
    isMixin: jest.fn(() => false),
    hasMixin: jest.fn(),
    getClass: jest.fn(() => ({ label: 'Test' }))
  } as unknown as Hierarchy
}

function lowLevelForDocs (...docs: Doc[]): LowLevelStorage {
  const byDomain = new Map<string, Doc[]>()
  for (const d of docs) {
    const domain = `domain:${String(d._class)}`
    const list = byDomain.get(domain) ?? []
    list.push(d)
    byDomain.set(domain, list)
  }
  return {
    rawFindAll: jest.fn(async <T extends Doc>(_domain: string, query: any): Promise<T[]> => {
      const domainDocs = byDomain.get(_domain) ?? []
      return domainDocs.filter((d) => {
        if (query._id !== undefined && d._id !== query._id) return false
        for (const [key, val] of Object.entries(query)) {
          if (key.startsWith('_')) continue
          if ((d as any)[key] !== val) return false
        }
        return true
      }) as T[]
    })
  } as unknown as LowLevelStorage
}

function createExporter (exportDocument: jest.Mock): { exporter: RelationExporter, state: ExportState } {
  const state: ExportState = {
    idMapping: new Map(),
    spaceMapping: new Map(),
    processingDocs: new Set(),
    uniqueFieldValues: new Map()
  }
  const ctx = new MeasureMetricsContext('relation-exporter-test', {})
  const exporter = new RelationExporter(ctx, state, exportDocument as any)
  return { exporter, state }
}

describe('RelationExporter sourceClass', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('runs forward relation when doc class is derived from sourceClass', async () => {
    const parentId = '69286dc0cb49b698d3ea2c95' as Ref<Doc>
    const parent = doc(parentId, classTarget, { name: 'parent' })
    const child = doc('69286dc1cb49b698d3ea2c98', classChild, { folder: parentId })

    const exportDocument = jest.fn().mockResolvedValue(true)
    const { exporter } = createExporter(exportDocument)
    const hierarchy = hierarchyWithDerivation(true)
    const lowLevel = lowLevelForDocs(parent)

    const relations: RelationDefinition[] = [
      {
        sourceClass: classParent,
        field: 'folder',
        class: classTarget,
        direction: 'forward'
      }
    ]

    await exporter.exportForwardRelations(child, relations, 'duplicate', true, hierarchy, lowLevel)

    expect(exportDocument).toHaveBeenCalledTimes(1)
    expect(exportDocument).toHaveBeenCalledWith(
      parent,
      'duplicate',
      true,
      hierarchy,
      lowLevel,
      expect.any(Map),
      relations
    )
  })

  it('skips forward relation when doc class is not derived from sourceClass', async () => {
    const parentId = '69286dc0cb49b698d3ea2c95' as Ref<Doc>
    const parent = doc(parentId, classTarget, {})
    const unrelated = doc('69286dc1cb49b698d3ea2c98', classUnrelated, { folder: parentId })

    const exportDocument = jest.fn().mockResolvedValue(true)
    const { exporter } = createExporter(exportDocument)
    const hierarchy = hierarchyWithDerivation(true)
    const lowLevel = lowLevelForDocs(parent)

    const relations: RelationDefinition[] = [
      {
        sourceClass: classParent,
        field: 'folder',
        class: classTarget,
        direction: 'forward'
      }
    ]

    await exporter.exportForwardRelations(unrelated, relations, 'duplicate', true, hierarchy, lowLevel)

    expect(exportDocument).not.toHaveBeenCalled()
  })

  it('runs forward relation without sourceClass for any doc (backward compatible)', async () => {
    const refId = '69286dc0cb49b698d3ea2c95' as Ref<Doc>
    const target = doc(refId, classTarget, {})
    const anyDoc = doc('69286dc1cb49b698d3ea2c98', classUnrelated, { link: refId })

    const exportDocument = jest.fn().mockResolvedValue(true)
    const { exporter } = createExporter(exportDocument)
    const hierarchy = hierarchyWithDerivation(false)
    jest.mocked(hierarchy.findDomain).mockImplementation((c) => `domain:${String(c)}` as any)
    const lowLevel = lowLevelForDocs(target)

    const relations: RelationDefinition[] = [{ field: 'link', class: classTarget, direction: 'forward' }]

    await exporter.exportForwardRelations(anyDoc, relations, 'duplicate', true, hierarchy, lowLevel)

    expect(exportDocument).toHaveBeenCalledTimes(1)
    expect(exportDocument).toHaveBeenCalledWith(
      target,
      'duplicate',
      true,
      hierarchy,
      lowLevel,
      expect.any(Map),
      relations
    )
  })

  it('runs inverse relation when doc class is derived from sourceClass', async () => {
    const anchorId = '69286dc0cb49b698d3ea2c95' as Ref<Doc>
    const anchor = doc(anchorId, classChild, {})
    const pointing = doc('69286dc1cb49b698d3ea2c98', classTarget, { owner: anchorId })

    const exportDocument = jest.fn().mockResolvedValue(true)
    const { exporter } = createExporter(exportDocument)
    const hierarchy = hierarchyWithDerivation(true)
    jest.mocked(hierarchy.findDomain).mockReturnValue(`domain:${String(classTarget)}` as any)
    jest.mocked(hierarchy.isDerived).mockImplementation((cls, base) => {
      if (cls === base) return true
      if (cls === classChild && base === classParent) return true
      if (cls === classTarget && base === classTarget) return true
      return false
    })

    const lowLevel = lowLevelForDocs(pointing)

    const relations: RelationDefinition[] = [
      {
        sourceClass: classParent,
        field: 'owner',
        class: classTarget,
        direction: 'inverse'
      }
    ]

    await exporter.exportInverseRelations(anchor, relations, 'duplicate', true, hierarchy, lowLevel)

    expect(exportDocument).toHaveBeenCalledTimes(1)
    expect(exportDocument).toHaveBeenCalledWith(
      pointing,
      'duplicate',
      true,
      hierarchy,
      lowLevel,
      expect.any(Map),
      relations
    )
  })

  it('skips inverse relation when doc class is not derived from sourceClass', async () => {
    const anchor = doc('69286dc0cb49b698d3ea2c95', classUnrelated, {})
    const pointing = doc('69286dc1cb49b698d3ea2c98', classTarget, { owner: anchor._id })

    const exportDocument = jest.fn().mockResolvedValue(true)
    const { exporter } = createExporter(exportDocument)
    const hierarchy = hierarchyWithDerivation(true)
    jest.mocked(hierarchy.findDomain).mockReturnValue(`domain:${String(classTarget)}` as any)

    const lowLevel = lowLevelForDocs(pointing)

    const relations: RelationDefinition[] = [
      {
        sourceClass: classParent,
        field: 'owner',
        class: classTarget,
        direction: 'inverse'
      }
    ]

    await exporter.exportInverseRelations(anchor, relations, 'duplicate', true, hierarchy, lowLevel)

    expect(exportDocument).not.toHaveBeenCalled()
  })
})
