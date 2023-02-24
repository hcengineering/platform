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

import { Board, Card } from '@hcengineering/board'
import {
  AttachedDoc,
  Class,
  Doc,
  DOMAIN_TX,
  generateId,
  Ref,
  Space,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxOperations,
  TxProcessor,
  TxUpdateDoc
} from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TAGS } from '@hcengineering/model-tags'
import { createKanbanTemplate, createSequence, DOMAIN_TASK } from '@hcengineering/model-task'
import tags, { TagElement, TagReference } from '@hcengineering/tags'
import task, { createKanban, KanbanTemplate } from '@hcengineering/task'
import board from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: board.space.DefaultBoard
  })
  if (current === undefined) {
    await tx.createDoc(
      board.class.Board,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default board',
        private: false,
        archived: false,
        members: []
      },
      board.space.DefaultBoard
    )
  }
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: 9, title: 'To do' },
      { color: 9, title: 'Done' }
    ],
    doneStates: [
      { isWon: true, title: 'Won' },
      { isWon: false, title: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: board.template.DefaultBoard,
    space: board.space.BoardTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default board',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}

async function createDefaultKanban (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(task.class.Kanban, {
    attachedTo: board.space.DefaultBoard
  })
  if (current !== undefined) return
  const defaultTmpl = await createDefaultKanbanTemplate(tx)
  await createKanban(tx, board.space.DefaultBoard, defaultTmpl)
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, board.class.Card)
  await createDefaultKanban(tx)
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
    {
      icon: tags.icon.Tags,
      label: 'Other',
      targetClass: board.class.Card,
      tags: [],
      default: true
    },
    board.category.Other
  )
}

interface CardLabel extends AttachedDoc {
  title: string
  color: number
  isHidden?: boolean
}
async function migrateLabels (client: MigrationClient): Promise<void> {
  const objectClass = 'board:class:CardLabel' as Ref<Class<Doc>>
  const txes = await client.find<TxCUD<CardLabel>>(DOMAIN_TX, { objectClass }, { sort: { modifiedOn: 1 } })
  const collectionTxes = await client.find<TxCollectionCUD<Board, CardLabel>>(
    DOMAIN_TX,
    { 'tx.objectClass': objectClass },
    { sort: { modifiedOn: 1 } }
  )
  await Promise.all([...txes, ...collectionTxes].map(({ _id }) => client.delete<Doc>(DOMAIN_TX, _id)))
  const removed = txes.filter(({ _class }) => _class === core.class.TxRemoveDoc).map(({ objectId }) => objectId)
  const createTxes = txes.filter(
    ({ _class, objectId }) => _class === core.class.TxCreateDoc && !removed.includes(objectId)
  ) as unknown as TxCreateDoc<CardLabel>[]
  const cardLabels = createTxes.map((createTx) => {
    const cardLabel = TxProcessor.createDoc2Doc(createTx)
    const updateTxes = collectionTxes
      .map(({ tx }) => tx)
      .filter(
        ({ _class, objectId }) => _class === core.class.TxUpdateDoc && objectId === createTx.objectId
      ) as unknown as TxUpdateDoc<CardLabel>[]
    return updateTxes.reduce((label, updateTx) => TxProcessor.updateDoc2Doc(label, updateTx), cardLabel)
  })
  await Promise.all(
    cardLabels.map((cardLabel) =>
      client.create<TagElement>(DOMAIN_TAGS, {
        _class: tags.class.TagElement,
        space: tags.space.Tags,
        targetClass: board.class.Card,
        category: board.category.Other,
        _id: cardLabel._id as unknown as Ref<TagElement>,
        modifiedBy: cardLabel.modifiedBy,
        modifiedOn: cardLabel.modifiedOn,
        title: cardLabel.title,
        color: cardLabel.color,
        description: ''
      })
    )
  )
  const cards = (await client.find<Card>(DOMAIN_TASK, { _class: board.class.Card })).filter((card) =>
    Array.isArray(card.labels)
  )
  for (const card of cards) {
    const labelRefs = card.labels as unknown as Array<Ref<CardLabel>>
    await client.update<Card>(DOMAIN_TASK, { _id: card._id }, { labels: labelRefs.length })
    for (const labelRef of labelRefs) {
      const cardLabel = cardLabels.find(({ _id }) => _id === labelRef)
      if (cardLabel === undefined) continue
      await client.create<TagReference>(DOMAIN_TAGS, {
        _class: tags.class.TagReference,
        attachedToClass: board.class.Card,
        _id: generateId(),
        attachedTo: card._id,
        space: card.space,
        tag: cardLabel._id as unknown as Ref<TagElement>,
        title: cardLabel.title,
        color: cardLabel.color,
        modifiedBy: cardLabel.modifiedBy,
        modifiedOn: cardLabel.modifiedOn,
        collection: 'labels'
      })
    }
  }
}

async function fillCreatedBy (client: MigrationClient): Promise<void> {
  const objects = await client.find<Board>(DOMAIN_SPACE, {
    _class: board.class.Board,
    createdBy: { $exists: false }
  })
  const txes = await client.find<TxCreateDoc<Board>>(DOMAIN_TX, {
    objectClass: board.class.Board,
    _class: core.class.TxCreateDoc
  })
  const txMap = new Map(txes.map((p) => [p.objectId, p]))

  for (const object of objects) {
    const createTx = txMap.get(object._id)
    if (createTx !== undefined && createTx.attributes.createdBy === undefined) {
      await client.update(
        DOMAIN_TX,
        { _id: createTx._id },
        {
          'attributes.createdBy': createTx.modifiedBy
        }
      )
    }
    await client.update(
      DOMAIN_SPACE,
      { _id: object._id },
      {
        createdBy: createTx?.modifiedBy ?? object.modifiedBy
      }
    )
  }
}

export const boardOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await Promise.all([migrateLabels(client)])
    await fillCreatedBy(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createDefaults(ops)
  }
}
