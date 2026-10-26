// Copyright © 2026 Hardcore Engineering Inc.
// Licensed under the Eclipse Public License, Version 2.0

import core, { ModelDb, type Client, type PersonId, type Ref, type Tx, type TxResult } from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import { createModel as createCoreModel } from '@hcengineering/model-core'
import tags, { TTagCategory, type TagCategory } from '@hcengineering/model-tags'
import { recruitId } from '@hcengineering/recruit'

import { recruitOperation } from '../migration'
import recruit from '../plugin'

function createCategory (overrides: Partial<TagCategory> = {}): TagCategory {
  return {
    _id: recruit.category.VacancyOther,
    _class: tags.class.TagCategory,
    space: core.space.Workspace,
    modifiedBy: core.account.System,
    modifiedOn: 0,
    icon: tags.icon.Tags,
    label: 'Other',
    targetClass: recruit.class.Vacancy,
    tags: [],
    default: true,
    ...overrides
  }
}

function createContext (categories: TagCategory[] = []): {
  model: ModelDb
  client: Client
  tx: jest.Mock<Promise<TxResult>, [Tx]>
} {
  const builder = new Builder()
  createCoreModel(builder)
  builder.createModel(TTagCategory)
  const model = new ModelDb(builder.hierarchy)
  for (const category of categories) {
    model.addDoc(category)
  }
  const tx = jest.fn(async (transaction: Tx): Promise<TxResult> => {
    await model.tx(transaction)
    return {}
  })
  const partialClient: Pick<Client, 'getHierarchy' | 'findAll' | 'findOne' | 'tx'> = {
    getHierarchy: () => builder.hierarchy,
    findAll: (clazz, query, options) => model.findAll(clazz, query, options),
    findOne: (clazz, query, options) => model.findOne(clazz, query, options),
    tx
  }
  const client = partialClient as Client
  return { model, client, tx }
}

describe('create-vacancy-tag-category upgrade', () => {
  const initialState = (): Map<string, Set<string>> => new Map([[recruitId, new Set(['create-defaults-v2'])]])

  it('creates a default vacancy category with a stable ID', async () => {
    const { model, client } = createContext()

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    const categories = await model.findAll(tags.class.TagCategory, {})
    expect(categories).toHaveLength(1)
    expect(categories[0]).toMatchObject({
      _id: recruit.category.VacancyOther,
      space: core.space.Workspace,
      icon: tags.icon.Tags,
      label: 'Other',
      targetClass: recruit.class.Vacancy,
      tags: [],
      default: true
    })
    expect(Array.from(await model.findAll(core.class.MigrationState, { plugin: recruitId }))).toEqual([
      expect.objectContaining({ state: 'create-vacancy-tag-category' })
    ])
  })

  it('does not duplicate the category when retried without a completion marker', async () => {
    const { model, client, tx } = createContext()

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')
    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    expect(await model.findAll(tags.class.TagCategory, {})).toHaveLength(1)
    const categoryWrites = tx.mock.calls.filter(([transaction]) => transaction.objectClass === tags.class.TagCategory)
    expect(categoryWrites).toHaveLength(1)
  })

  it('skips a completed upgrade step', async () => {
    const { client, tx } = createContext()
    const state = new Map([[recruitId, new Set(['create-defaults-v2', 'create-vacancy-tag-category'])]])

    await recruitOperation.upgrade(state, async () => client, 'upgrade')

    expect(tx).not.toHaveBeenCalled()
  })

  it('preserves an existing category and its user customizations', async () => {
    const category = createCategory({
      label: 'My labels',
      tags: ['engineering'],
      modifiedBy: 'test:user' as PersonId
    })
    const { model, client, tx } = createContext([category])

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    expect(Array.from(await model.findAll(tags.class.TagCategory, {}))).toEqual([category])
    expect(tx).toHaveBeenCalledTimes(1)
    expect(tx).toHaveBeenCalledWith(expect.objectContaining({ objectClass: core.class.MigrationState }))
  })

  it('reuses an existing Other category with a different ID and makes it the default', async () => {
    const category = createCategory({
      _id: 'test:category:Other' as Ref<TagCategory>,
      default: false,
      tags: ['engineering'],
      modifiedBy: 'test:user' as PersonId
    })
    const expected = { ...category, default: true }
    const { model, client } = createContext([category])

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')
    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    const categories = await model.findAll(tags.class.TagCategory, {})
    expect(categories).toHaveLength(1)
    expect(categories[0]).toMatchObject({
      _id: expected._id,
      label: expected.label,
      icon: expected.icon,
      tags: expected.tags,
      targetClass: expected.targetClass,
      default: true
    })
  })

  it('keeps an existing default instead of promoting another Other category', async () => {
    const categories = [
      createCategory({ _id: 'test:category:Other' as Ref<TagCategory>, default: false }),
      createCategory({ _id: 'test:category:Default' as Ref<TagCategory>, label: 'General' })
    ]
    const { model, client, tx } = createContext(categories)

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    expect(Array.from(await model.findAll(tags.class.TagCategory, {}))).toEqual(categories)
    expect(tx).toHaveBeenCalledTimes(1)
    expect(tx).toHaveBeenCalledWith(expect.objectContaining({ objectClass: core.class.MigrationState }))
  })

  it('does not reuse an Other category belonging to another target class', async () => {
    const category = createCategory({
      _id: recruit.category.Other,
      targetClass: recruit.mixin.Candidate
    })
    const { model, client } = createContext([category])

    await recruitOperation.upgrade(initialState(), async () => client, 'upgrade')

    expect(await model.findAll(tags.class.TagCategory, {})).toHaveLength(2)
    expect(await model.findOne(tags.class.TagCategory, { _id: category._id })).toEqual(category)
    expect(Array.from(await model.findAll(tags.class.TagCategory, { targetClass: recruit.class.Vacancy }))).toEqual([
      expect.objectContaining({ _id: recruit.category.VacancyOther, default: true })
    ])
  })
})
