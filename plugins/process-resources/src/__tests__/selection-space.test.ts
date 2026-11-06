//
// Copyright © 2026 TraceX SAS.
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

import core from '@hcengineering/core'
import type { Association, Class, Client, Doc, Ref, Space } from '@hcengineering/core'
import { createContext } from '@hcengineering/process'
import type { ContextId, ExecutionContext, Process, SelectedContext } from '@hcengineering/process'
import { resolveSelectionQuery, resolveSelectionSpace } from '../selection-space'

const contextId = 'previous-step' as ContextId
const targetSpace = 'target-space' as Ref<Space>
const findOne = jest.fn()
const findAttribute = jest.fn()
const client = {
  findOne,
  getHierarchy: () => ({ findAttribute, isMixin: () => false })
} as unknown as Client
const definition = {
  masterTag: core.class.Doc,
  context: {
    [contextId]: {
      _class: core.class.Doc,
      name: 'Previous step',
      value: { type: 'context', id: contextId, key: '' }
    }
  }
} as unknown as Process
const doc: Doc = {
  _id: 'current-card' as Ref<Doc>,
  _class: core.class.Doc,
  space: targetSpace,
  modifiedOn: 0,
  modifiedBy: core.account.System
}

async function resolve (
  source: SelectedContext,
  value?: unknown,
  object: Doc | undefined = doc
): Promise<Ref<Space> | undefined> {
  const context: ExecutionContext = { __contextId: true, [contextId]: value }
  return await resolveSelectionSpace(client, definition, object, context, createContext(source))
}

beforeEach(() => {
  findOne.mockReset()
  findAttribute.mockReset()
})

test('preserves fixed spaces and an explicitly unrestricted selection', async () => {
  const context: ExecutionContext = { __contextId: true }
  await expect(resolveSelectionSpace(client, definition, doc, context, targetSpace)).resolves.toBe(targetSpace)
  await expect(resolveSelectionSpace(client, definition, doc, context, undefined)).resolves.toBeUndefined()
  expect(findOne).not.toHaveBeenCalled()
})

test.each([undefined, null])('does not add a space filter for an unconfigured selection: %p', async (configured) => {
  const context: ExecutionContext = { __contextId: true }
  const selectionSpace = await resolveSelectionSpace(client, definition, doc, context, configured)
  await expect(resolveSelectionQuery(client, doc._id, selectionSpace)).resolves.toEqual({})
  expect(findOne).not.toHaveBeenCalled()
})

test('uses the current card space', async () => {
  await expect(resolve({ type: 'attribute', key: 'space' })).resolves.toBe(targetSpace)
})

test('uses a custom space value from the process attribute editor', async () => {
  await expect(resolve({ type: 'const', key: '', value: targetSpace })).resolves.toBe(targetSpace)
})

test.each([targetSpace, { _id: targetSpace }])('uses a space from a previous result: %p', async (value) => {
  await expect(resolve({ type: 'context', id: contextId, key: '' }, value)).resolves.toBe(targetSpace)
})

test('reads the space from an object stored in the execution context', async () => {
  await expect(resolve({ type: 'context', id: contextId, key: 'space' }, doc)).resolves.toBe(targetSpace)
  expect(findOne).not.toHaveBeenCalled()
})

test('loads an object when the context contains its reference', async () => {
  findOne.mockResolvedValue(doc)
  await expect(resolve({ type: 'context', id: contextId, key: 'space' }, 'selected-card')).resolves.toBe(targetSpace)
  expect(findOne).toHaveBeenCalledWith(core.class.Doc, { _id: 'selected-card' })
})

test('resolves imported attribute bindings', async () => {
  const context: ExecutionContext = { __contextId: true }
  await expect(
    resolveSelectionSpace(
      client,
      { ...definition, bindings: { spaceSlot: 'space' } },
      doc,
      context,
      createContext({ type: 'attribute', key: 'spaceSlot' })
    )
  ).resolves.toBe(targetSpace)
})

test.each([undefined, null, '', [], [targetSpace]])(
  'does not remove the restriction for an invalid context: %p',
  async (value) => {
    await expect(resolve({ type: 'context', id: contextId, key: '' }, value)).rejects.toThrow()
  }
)

test('does not remove the restriction when the referenced object is unavailable', async () => {
  findOne.mockResolvedValue(undefined)
  await expect(resolve({ type: 'context', id: contextId, key: 'space' }, 'missing-card')).rejects.toThrow()
})

describe('relation selection', () => {
  const association = 'association' as Ref<Association>
  const findAll = jest.fn()
  const classHierarchyMixin = jest.fn()
  const relationClient = {
    findAll,
    getModel: () => ({ getObject: () => ({ classA: 'class-a', classB: 'class-b' }) }),
    getHierarchy: () => ({ classHierarchyMixin })
  } as unknown as Client

  beforeEach(() => {
    classHierarchyMixin.mockReset()
  })

  test.each(['A', 'B'] as const)('excludes only targets on side %s and retains the space', async (direction) => {
    findAll.mockReset().mockResolvedValue([
      { docA: 'target-a', docB: 'target-b' },
      { docA: 'target-a', docB: 'target-b' }
    ])
    const query = await resolveSelectionQuery(relationClient, doc._id, targetSpace, { association, direction })
    expect(findAll).toHaveBeenCalledWith(core.class.Relation, {
      association,
      ...(direction === 'A' ? { docB: doc._id } : { docA: doc._id })
    })
    expect(query).toEqual({ space: targetSpace, _id: { $nin: [direction === 'A' ? 'target-a' : 'target-b'] } })
  })

  test.each(['A', 'B'] as const)('explicitly includes historical relation targets on side %s', async (direction) => {
    classHierarchyMixin.mockReturnValue({ enabled: true })
    findAll.mockResolvedValue([])
    const query = await resolveSelectionQuery(relationClient, doc._id, targetSpace, { association, direction })
    expect(classHierarchyMixin).toHaveBeenCalledWith(
      direction === 'A' ? 'class-a' : 'class-b',
      core.mixin.VersionableClass
    )
    expect(query).toEqual({ space: targetSpace, isLatest: { $in: [true, false] }, _id: { $nin: [] } })
  })

  test.each([
    ['all', { isLatest: { $in: [true, false] } }],
    ['latest', { isLatest: true }],
    ['effective', { isLatest: { $in: [true, false] }, isEffective: true }]
  ] as const)('applies the %s version mode without losing selection constraints', async (versions, expected) => {
    classHierarchyMixin.mockReturnValue({ enabled: true })
    findAll.mockResolvedValue([{ docA: doc._id, docB: 'linked-version' }])
    const query = await resolveSelectionQuery(relationClient, doc._id, targetSpace, {
      association,
      direction: 'B',
      versions
    })
    expect(query).toEqual({ space: targetSpace, ...expected, _id: { $nin: ['linked-version'] } })
  })

  test('does not filter non-versionable targets by version fields', async () => {
    findAll.mockResolvedValue([])
    await expect(
      resolveSelectionQuery(relationClient, doc._id, undefined, {
        association,
        direction: 'B',
        versions: 'effective'
      })
    ).resolves.toEqual({ _id: { $nin: [] } })
  })

  test('request settings override legacy AddRelation settings', async () => {
    classHierarchyMixin.mockReturnValue({ enabled: true })
    findAll.mockResolvedValue([])
    const query = await resolveSelectionQuery(
      relationClient,
      doc._id,
      targetSpace,
      { association, direction: 'B', versions: 'latest' },
      'class-b' as Ref<Class<Doc>>,
      'effective'
    )
    expect(query).toEqual({
      space: targetSpace,
      isLatest: { $in: [true, false] },
      isEffective: true,
      _id: { $nin: [] }
    })
  })

  test('applies request version settings without a relation', async () => {
    classHierarchyMixin.mockReturnValue({ enabled: true })
    findAll.mockReset()
    const query = await resolveSelectionQuery(
      relationClient,
      undefined,
      targetSpace,
      undefined,
      'class-b' as Ref<Class<Doc>>,
      'effective'
    )
    expect(query).toEqual({ space: targetSpace, isLatest: { $in: [true, false] }, isEffective: true })
    expect(findAll).not.toHaveBeenCalled()
  })

  test('does not query relations without a configured restriction', async () => {
    findAll.mockReset()
    await expect(resolveSelectionQuery(relationClient, undefined, targetSpace)).resolves.toEqual({ space: targetSpace })
    expect(findAll).not.toHaveBeenCalled()
  })

  test('does not silently drop the filter without a process card', async () => {
    await expect(
      resolveSelectionQuery(relationClient, undefined, undefined, { association, direction: 'A' })
    ).rejects.toThrow()
  })
})
