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
//

import card, { type MasterTag } from '@hcengineering/card'
import core, {
  type AnyAttribute,
  type Data,
  type DocumentUpdate,
  type Hierarchy,
  TxOperations,
  type TxResult
} from '@hcengineering/core'
import { type MigrationUpgradeClient } from '@hcengineering/model'
import view, { type Viewlet } from '@hcengineering/view'
import { addCardTitleSorting, migrateViewlets } from '../migration'

jest.mock('..', () => jest.requireActual('@hcengineering/card'))

describe('addCardTitleSorting', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('migrates string and object card columns while preserving custom columns and sorting', async () => {
    const masterTag: Partial<MasterTag> = { _id: 'test:class:MasterTag' as MasterTag['_id'] }
    const descendants = [card.class.Card, 'test:class:NestedCard' as MasterTag['_id']]
    const viewlet: Partial<Viewlet> = {
      config: [
        '',
        { key: '', props: { shrink: true }, displayProps: { fixed: 'left' } },
        { key: '', sortingKey: '' },
        { key: '', presenter: card.component.CardTagsColored, label: card.string.Tags },
        { key: '', displayProps: { grow: true } },
        { key: '', sortingKey: 'modifiedOn' },
        'modifiedOn'
      ]
    }
    const hierarchy: Partial<Hierarchy> = { getDescendants: jest.fn().mockReturnValue(descendants) }
    const findAll = jest.fn().mockResolvedValueOnce([masterTag]).mockResolvedValueOnce([viewlet])
    const client: Partial<MigrationUpgradeClient> = {
      findAll,
      getHierarchy: () => hierarchy as Hierarchy
    }
    const result: TxResult = {}
    const update = jest.spyOn(TxOperations.prototype, 'update').mockResolvedValue(result)

    await addCardTitleSorting(client as MigrationUpgradeClient)

    expect(findAll).toHaveBeenNthCalledWith(2, view.class.Viewlet, {
      attachTo: { $in: [masterTag._id, ...descendants, card.class.Card] },
      descriptor: { $in: [view.viewlet.Table, view.viewlet.RelationshipTable] }
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(viewlet, {
      config: [
        { key: '', sortingKey: 'title' },
        { key: '', props: { shrink: true }, displayProps: { fixed: 'left' }, sortingKey: 'title' },
        { key: '', sortingKey: 'title' },
        ...viewlet.config!.slice(3)
      ]
    })
  })

  it('does not write when title sorting is already configured or no card column exists', async () => {
    const hierarchy: Partial<Hierarchy> = { getDescendants: jest.fn().mockReturnValue([card.class.Card]) }
    const configured: Partial<Viewlet> = { config: [{ key: '', sortingKey: 'title' }, 'modifiedOn'] }
    const withoutCardColumn: Partial<Viewlet> = { config: ['title', 'modifiedOn'] }
    const client: Partial<MigrationUpgradeClient> = {
      findAll: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([configured, withoutCardColumn]),
      getHierarchy: () => hierarchy as Hierarchy
    }
    const result: TxResult = {}
    const update = jest.spyOn(TxOperations.prototype, 'update').mockResolvedValue(result)

    await addCardTitleSorting(client as MigrationUpgradeClient)

    expect(update).not.toHaveBeenCalled()
  })

  it('preserves column count, order and custom settings on repeated runs', async () => {
    const config: Viewlet['config'] = [
      '',
      '_class',
      { key: '', presenter: card.component.CardTagsColored, label: card.string.Tags },
      'modifiedOn',
      'customPreconditions',
      { key: 'customApprovers', displayProps: { optional: true }, props: { readonly: true } },
      '$associations.steps_b',
      'version',
      '$associations.steps_b.customOrder'
    ]
    const originalConfig = structuredClone(config)
    const viewlet: Partial<Viewlet> = { config }
    const hierarchy: Partial<Hierarchy> = { getDescendants: jest.fn().mockReturnValue([card.class.Card]) }
    const client: Partial<MigrationUpgradeClient> = {
      findAll: jest
        .fn()
        .mockImplementation(async (_class: Viewlet['_class'] | MasterTag['_class']) =>
          _class === card.class.MasterTag ? [] : [viewlet]
        ),
      getHierarchy: () => hierarchy as Hierarchy
    }
    const result: TxResult = {}
    const update = jest.spyOn(TxOperations.prototype, 'update').mockResolvedValue(result)

    await addCardTitleSorting(client as MigrationUpgradeClient)

    const operations = update.mock.calls[0][1]
    const migrated = (operations as DocumentUpdate<Viewlet>).config
    expect(migrated).toEqual([{ key: '', sortingKey: 'title' }, ...originalConfig.slice(1)])
    expect(migrated).toHaveLength(originalConfig.length)
    expect(config).toEqual(originalConfig)

    viewlet.config = migrated
    update.mockClear()
    await addCardTitleSorting(client as MigrationUpgradeClient)

    expect(update).not.toHaveBeenCalled()
  })
})

describe('migrateViewlets', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each([view.viewlet.Table, view.viewlet.List])(
    'does not append an attribute already configured as a string or object in %s',
    async (descriptor) => {
      const masterTag: Partial<MasterTag> = { _id: 'test:class:MasterTag' as MasterTag['_id'] }
      const base: Partial<Viewlet> = {
        descriptor,
        config: [
          { key: '', sortingKey: 'title' },
          { key: '', presenter: card.component.CardTagsColored, label: card.string.Tags },
          { key: '', displayProps: { grow: true } },
          'customPreconditions',
          { key: 'customApprovers', displayProps: { optional: true } },
          'modifiedOn'
        ]
      }
      const originalConfig = structuredClone(base.config)
      const existing: Partial<Viewlet> = { attachTo: masterTag._id, descriptor }
      const attributes = new Map<string, AnyAttribute>()
      for (const name of ['customPreconditions', 'customApprovers', 'customNewField']) {
        const attribute: Partial<AnyAttribute> = { name }
        attributes.set(name, attribute as AnyAttribute)
      }
      const hierarchy: Partial<Hierarchy> = { getOwnAttributes: () => attributes }
      const findAll = jest
        .fn()
        .mockResolvedValueOnce([base])
        .mockResolvedValueOnce([masterTag])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([base])
        .mockResolvedValueOnce([masterTag])
        .mockResolvedValueOnce([existing])
      const client: Partial<MigrationUpgradeClient> = {
        findAll,
        getHierarchy: () => hierarchy as Hierarchy
      }
      const create = jest.spyOn(TxOperations.prototype, 'createDoc').mockResolvedValue('test:viewlet' as Viewlet['_id'])
      const update = jest.spyOn(TxOperations.prototype, 'diffUpdate').mockResolvedValue(existing as Viewlet)
      const expectedConfig = [...base.config!]
      expectedConfig.splice(descriptor === view.viewlet.List ? 3 : expectedConfig.length, 0, 'customNewField')

      await migrateViewlets(client as MigrationUpgradeClient)

      expect(create).toHaveBeenCalledTimes(1)
      const created = create.mock.calls[0][2]
      expect((created as Data<Viewlet>).config).toEqual(expectedConfig)
      expect(create).toHaveBeenCalledWith(
        view.class.Viewlet,
        core.space.Model,
        expect.objectContaining({
          attachTo: masterTag._id,
          config: expectedConfig
        })
      )
      existing.config = (created as Data<Viewlet>).config

      await migrateViewlets(client as MigrationUpgradeClient)

      expect(create).toHaveBeenCalledTimes(1)
      expect(update).toHaveBeenCalledTimes(1)
      const updated = update.mock.calls[0][1]
      expect((updated as Data<Viewlet>).config).toEqual(expectedConfig)
      expect(base.config).toEqual(originalConfig)
    }
  )
})
