//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { getAccountDB } from '@hcengineering/account'
import calendar from '@hcengineering/calendar'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { loadCollabYdoc, saveCollabYdoc, yDocToBuffer } from '@hcengineering/collaboration'
import contact from '@hcengineering/contact'
import core, {
  type ArrOf,
  type BackupClient,
  type Class,
  ClassifierKind,
  type CollaborativeDoc,
  type Client as CoreClient,
  DOMAIN_BENCHMARK,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MIGRATION,
  DOMAIN_MODEL,
  DOMAIN_STATUS,
  DOMAIN_TX,
  type Doc,
  type DocumentUpdate,
  type Domain,
  type Hierarchy,
  type Markup,
  type MeasureContext,
  type MigrationState,
  type Ref,
  type RefTo,
  type RelatedDocument,
  SortingOrder,
  type Status,
  type StatusCategory,
  type Tx,
  type TxCUD,
  type TxCreateDoc,
  type TxMixin,
  TxOperations,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc,
  type WorkspaceUuid,
  generateId,
  getObjectValue,
  toIdMap,
  updateAttribute
} from '@hcengineering/core'
import activity, { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import recruitModel, { defaultApplicantStatuses } from '@hcengineering/model-recruit'
import { getMongoClient, getWorkspaceMongoDB } from '@hcengineering/mongo'
import recruit, { type Applicant, type Vacancy } from '@hcengineering/recruit'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { type StorageAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { connect } from '@hcengineering/server-tool'
import tags, { type TagCategory, type TagElement, type TagReference } from '@hcengineering/tags'
import task, { type ProjectType, type Task, type TaskType } from '@hcengineering/task'
import { updateYDocContent } from '@hcengineering/text-ydoc'
import tracker from '@hcengineering/tracker'
import { deepEqual } from 'fast-equals'
import { type Db } from 'mongodb'

export async function cleanWorkspace (
  ctx: MeasureContext,
  mongoUrl: string,
  workspaceId: WorkspaceUuid,
  storageAdapter: StorageAdapter,
  transactorUrl: string,
  opt: { recruit: boolean, tracker: boolean, removedTx: boolean }
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  try {
    const ops = new TxOperations(connection, core.account.System)

    const hierarchy = ops.getHierarchy()

    if (opt.recruit) {
      const contacts = await ops.findAll(recruit.mixin.Candidate, {})
      console.log('removing Talents', contacts.length)
      const filter = contacts.filter((it) => !hierarchy.isDerived(it._class, contact.mixin.Employee))

      while (filter.length > 0) {
        const part = filter.splice(0, 100)
        const op = ops.apply()
        for (const c of part) {
          await op.remove(c)
        }
        const t = Date.now()
        console.log('remove:', part.map((it) => it.name).join(', '))
        await op.commit()
        const t2 = Date.now()
        console.log('remove time:', t2 - t, filter.length)
      }
    }

    if (opt.tracker) {
      const issues = await ops.findAll(tracker.class.Issue, {})
      console.log('removing Issues', issues.length)

      while (issues.length > 0) {
        const part = issues.splice(0, 5)
        const op = ops.apply()
        for (const c of part) {
          await op.remove(c)
        }
        const t = Date.now()
        await op.commit()
        const t2 = Date.now()
        console.log('remove time:', t2 - t, issues.length)
      }
    }

    const client = getMongoClient(mongoUrl)
    try {
      const _client = await client.getClient()
      const db = getWorkspaceMongoDB(_client, workspaceId)

      if (opt.removedTx) {
        let processed = 0
        const iterator = db.collection(DOMAIN_TX).find({})
        while (true) {
          const txes: Tx[] = []

          const doc = await iterator.next()
          if (doc == null) {
            break
          }
          txes.push(doc as unknown as Tx)
          if (iterator.bufferedCount() > 0) {
            txes.push(...(iterator.readBufferedDocuments() as unknown as Tx[]))
          }

          for (const tx of txes) {
            if (tx._class === core.class.TxRemoveDoc) {
              // We need to remove all update and create operations for document
              await db.collection(DOMAIN_TX).deleteMany({ objectId: (tx as TxRemoveDoc<Doc>).objectId })
              processed++
            }
          }
          if (processed % 1000 === 0) {
            console.log('processed', processed)
          }
        }
      }
    } finally {
      client.close()
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

export async function fixMinioBW (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  storageService: StorageAdapter
): Promise<void> {
  console.log('try clean bw miniature for ', workspaceId)
  const from = new Date(new Date().setDate(new Date().getDate() - 7)).getTime()
  const list = await storageService.listStream(ctx, workspaceId)
  let removed = 0
  while (true) {
    const objs = await list.next()
    if (objs.length === 0) {
      break
    }
    for (const obj of objs) {
      if (obj.modifiedOn < from) continue
      if ((obj._id as string).includes('%preview%')) {
        await storageService.remove(ctx, workspaceId, [obj._id])
        removed++
        if (removed % 100 === 0) {
          console.log('removed: ', removed)
        }
      }
    }
  }
  console.log('FINISH, removed: ', removed)
}

export async function cleanRemovedTransactions (workspaceId: WorkspaceUuid, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    let count = 0
    while (true) {
      const removedDocs = await connection.findAll(core.class.TxRemoveDoc, {}, { limit: 1000 })
      if (removedDocs.length === 0) {
        break
      }

      const toRemove = await connection.findAll(core.class.TxCUD, {
        objectId: { $in: removedDocs.map((it) => it.objectId) }
      })
      await connection.clean(
        DOMAIN_TX,
        toRemove.map((it) => it._id)
      )

      count += toRemove.length
      console.log('processed', count)
    }

    console.log('total docs with remove', count)
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

export async function optimizeModel (workspaceId: WorkspaceUuid, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  try {
    let count = 0

    const model = connection.getModel()

    const updateTransactions = await connection.findAll(
      core.class.TxUpdateDoc,
      {
        objectSpace: core.space.Model,
        _class: core.class.TxUpdateDoc
      },
      { sort: { _id: SortingOrder.Ascending, modifiedOn: SortingOrder.Ascending }, limit: 5000 }
    )

    const toRemove: Ref<Doc>[] = []

    let i = 0
    for (const tx of updateTransactions) {
      try {
        const doc = model.findObject(tx.objectId)
        if (doc === undefined) {
          // Document is removed, we could remove update transaction at all
          toRemove.push(tx._id)
          console.log('marking update tx to remove', tx)
          continue
        }
        const opt: any = { ...tx.operations }
        const adoc = doc as any

        let uDoc: any = {}

        // Find next update operations for same doc
        for (const ops of updateTransactions.slice(i + 1).filter((it) => it.objectId === tx.objectId)) {
          uDoc = { ...uDoc, ...ops.operations }
        }

        for (const [k, v] of Object.entries(opt)) {
          // If value is same as in document or we have more transactions with same value updated.
          if (!k.startsWith('$') && (!deepEqual(adoc[k], v) || uDoc[k] !== undefined)) {
            // Current value is not we modify
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete opt[k]
          }
        }
        if (Object.keys(opt).length === 0) {
          // No operations pending, remove update tx.
          toRemove.push(tx._id)
          console.log('marking update tx to remove, since not real update is performed', tx)
        }
      } finally {
        i++
      }
    }

    await connection.clean(DOMAIN_TX, toRemove)

    count += toRemove.length
    console.log('processed', count)

    console.log('total docs with remove', count)
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}
export async function cleanArchivedSpaces (workspaceId: WorkspaceUuid, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const count = 0
    const ops = new TxOperations(connection, core.account.System)
    while (true) {
      const spaces = await connection.findAll(core.class.Space, { archived: true }, { limit: 1000 })
      if (spaces.length === 0) {
        break
      }

      const h = connection.getHierarchy()
      const withDomain = h
        .getDescendants(core.class.Doc)
        .filter((it) => h.findDomain(it) !== undefined)
        .filter((it) => !h.isMixin(it))
      for (const c of withDomain) {
        while (true) {
          const docs = await connection.findAll(c, { space: { $in: spaces.map((it) => it._id) } })
          if (docs.length === 0) {
            break
          }
          console.log('removing:', c, docs.length)
          for (const d of docs) {
            await ops.remove(d)
          }
        }
      }
      for (const s of spaces) {
        await ops.remove(s)
      }
    }

    console.log('total docs with remove', count)
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

export async function fixCommentDoubleIdCreate (workspaceId: WorkspaceUuid, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const commentTxes = await connection.findAll(core.class.TxCreateDoc, {
      objectClass: chunter.class.ChatMessage
    })
    const commentTxesRemoved = await connection.findAll(core.class.TxRemoveDoc, {
      objectClass: chunter.class.ChatMessage
    })
    const removed = new Map(commentTxesRemoved.map((it) => [it.objectId, it]))
    // Do not checked removed
    const objSet = new Set<Ref<Doc>>()
    const oldValue = new Map<Ref<Doc>, string>()
    for (const c of commentTxes) {
      const cid = c.objectId
      if (removed.has(cid)) {
        continue
      }
      const has = objSet.has(cid)
      objSet.add(cid)
      if (has) {
        // We have found duplicate one, let's rename it.
        const doc = TxProcessor.createDoc2Doc<ChatMessage>(c as unknown as TxCreateDoc<ChatMessage>)
        if (doc.message !== '' && doc.message.trim() !== '<p></p>') {
          await connection.clean(DOMAIN_TX, [c._id])
          if (oldValue.get(cid) === doc.message.trim()) {
            console.log('delete tx', cid, doc.message)
          } else {
            oldValue.set(doc._id, doc.message)
            console.log('renaming', cid, doc.message)
            // Remove previous transaction.
            c.objectId = generateId()
            doc._id = c.objectId as Ref<ChatMessage>
            await connection.upload(DOMAIN_TX, [c])
            // Also we need to create snapsot
            await connection.upload(DOMAIN_ACTIVITY, [doc])
          }
        }
      }
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

const DOMAIN_TAGS = 'tags' as Domain
export async function fixSkills (
  mongoUrl: string,
  workspaceId: WorkspaceUuid,
  transactorUrl: string,
  step: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  const client = getMongoClient(mongoUrl)
  try {
    const _client = await client.getClient()
    const db = getWorkspaceMongoDB(_client, workspaceId)

    async function fixCount (): Promise<void> {
      console.log('fixing ref-count...')
      const allTags = (await connection.findAll(tags.class.TagElement, {})) as TagElement[]
      for (const tag of allTags) {
        console.log('progress: ', ((allTags.indexOf(tag) + 1) * 100) / allTags.length)
        const references = await connection.findAll(tags.class.TagReference, { tag: tag._id }, { total: true })
        if (references.total >= 0) {
          await db.collection(DOMAIN_TAGS).updateOne({ _id: tag._id }, { $set: { refCount: references.total } })
        }
      }
      console.log('DONE: fixing ref-count')
    }

    // STEP 1: all to Upper Case
    if (step === '1') {
      console.log('converting case')
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      for (const tag of tagsToClean) {
        await db
          .collection(DOMAIN_TAGS)
          .updateOne({ _id: tag._id }, { $set: { title: tag.title.trim().toUpperCase() } })
      }
      console.log('DONE: converting case')
    }
    // STEP 2: Replace with same titles
    if (step === '2') {
      console.log('fixing titles')
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      const groupped = groupBy(tagsToClean, 'title')
      console.log('STEP2: Done grouping')
      for (const key in groupped) {
        const values = groupped[key]
        if (values.length === 1) continue
        // console.log('duplicates: ', values)
        const goodTag = values[0]
        for (const t of values) {
          if (t._id === goodTag._id) continue
          const references = await connection.findAll(tags.class.TagReference, {
            attachedToClass: recruit.mixin.Candidate,
            tag: t._id
          })
          goodTag.refCount = (goodTag.refCount ?? 0) + references.length
          for (const reference of references) {
            await db
              .collection(DOMAIN_TAGS)
              .updateOne(
                { _id: reference._id },
                { $set: { tag: goodTag._id, color: goodTag.color, title: goodTag.title } }
              )
          }
          await db.collection(DOMAIN_TAGS).deleteOne({ _id: t._id })
        }
        await db.collection(DOMAIN_TAGS).updateOne({ _id: goodTag._id }, { $set: { refCount: goodTag.refCount } })
      }
      console.log('STEP2 DONE')
    }
    // fix skills with + and -
    if (step === '3') {
      console.log('STEP 3')
      const ops = new TxOperations(connection, core.account.System)
      const regex = /\S+(?:[-+]\S+)+/g
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      const tagsMatchingRegex = tagsToClean.filter((tag) => regex.test(tag.title))
      let goodTags = (await connection.findAll(tags.class.TagElement, {
        category: {
          $nin: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      goodTags = goodTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
      for (const wrongTag of tagsMatchingRegex) {
        const incorrectStrings = wrongTag.title.match(regex)
        if (incorrectStrings == null) continue
        for (const str of incorrectStrings) {
          const goodTag = goodTags.find((t) => t.title.toUpperCase() === str.replaceAll(/[+-]/g, ''))
          if (goodTag === undefined) continue
          const references = (await connection.findAll(tags.class.TagReference, {
            attachedToClass: recruit.mixin.Candidate,
            tag: wrongTag._id
          })) as TagReference[]
          for (const ref of references) {
            await ops.addCollection(
              tags.class.TagReference,
              ref.space,
              ref.attachedTo,
              ref.attachedToClass,
              ref.collection,
              {
                title: goodTag.title,
                tag: goodTag._id,
                color: ref.color
              }
            )
            await db
              .collection(DOMAIN_TAGS)
              .updateOne({ _id: ref._id }, { $set: { title: ref.title.replace(str, '') } })
          }
          await db
            .collection(DOMAIN_TAGS)
            .updateOne({ _id: wrongTag._id }, { $set: { title: wrongTag.title.replace(str, goodTag.title) } })
        }
      }
      console.log('DONE: STEP 3')
    }
    // change incorrect skills and add good one
    if (step === '4') {
      console.log('step 4')
      let goodTags = (await connection.findAll(tags.class.TagElement, {
        category: {
          $nin: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      goodTags = goodTags.sort((a, b) => b.title.length - a.title.length).filter((t) => t.title.length > 2)
      const ops = new TxOperations(connection, core.account.System)
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      for (const incorrectTag of tagsToClean) {
        console.log('tag progress: ', ((tagsToClean.indexOf(incorrectTag) + 1) * 100) / tagsToClean.length)
        const toReplace = goodTags.filter((t) => incorrectTag.title.includes(t.title.toUpperCase()))
        if (toReplace.length === 0) continue
        const references = (await connection.findAll(tags.class.TagReference, {
          attachedToClass: recruit.mixin.Candidate,
          tag: incorrectTag._id
        })) as TagReference[]
        let title = incorrectTag.title
        for (const ref of references) {
          const refsForCand = (
            (await connection.findAll(tags.class.TagReference, {
              attachedToClass: recruit.mixin.Candidate,
              attachedTo: ref.attachedTo
            })) as TagReference[]
          ).map((r) => r.tag)
          for (const gTag of toReplace) {
            title = title.replace(gTag.title.toUpperCase(), '')
            if ((refsForCand ?? []).includes(gTag._id)) continue
            await ops.addCollection(
              tags.class.TagReference,
              ref.space,
              ref.attachedTo,
              ref.attachedToClass,
              ref.collection,
              {
                title: gTag.title,
                tag: gTag._id,
                color: ref.color
              }
            )
          }
          await db.collection(DOMAIN_TAGS).updateOne({ _id: ref._id }, { $set: { title } })
        }
        await db.collection(DOMAIN_TAGS).updateOne({ _id: incorrectTag._id }, { $set: { title } })
      }
      console.log('STEP4 DONE')
    }

    // remove skills with space or empty string
    if (step === '5') {
      console.log('STEP 5')
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        },
        title: { $in: [' ', ''] }
      })) as TagElement[]
      if (tagsToClean.length > 0) {
        for (const t of tagsToClean) {
          const references = (await connection.findAll(tags.class.TagReference, {
            attachedToClass: recruit.mixin.Candidate,
            tag: t._id
          })) as TagReference[]
          const ids = references.map((r) => r._id)
          await db.collection<Doc>(DOMAIN_TAGS).deleteMany({ _id: { $in: ids } })
          await db.collection<Doc>(DOMAIN_TAGS).deleteOne({ _id: t._id })
        }
      }
      await fixCount()
      console.log('DONE 5 STEP')
    }
    // remove skills with ref count less or equal to 10
    if (step === '6') {
      console.log('STEP 6')
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      for (const t of tagsToClean) {
        if ((t?.refCount ?? 0) >= 10) continue
        const references = (await connection.findAll(tags.class.TagReference, {
          attachedToClass: recruit.mixin.Candidate,
          tag: t._id
        })) as TagReference[]
        const ids = references.map((r) => r._id)
        await db.collection<Doc>(DOMAIN_TAGS).deleteMany({ _id: { $in: ids } })
        await db.collection<Doc>(DOMAIN_TAGS).deleteOne({ _id: t._id })
      }
      console.log('DONE 6 STEP')
    }
    // remove all skills that don't have letters in it
    if (step === '7') {
      console.log('STEP 7')
      const tagsToClean = (await connection.findAll(tags.class.TagElement, {
        category: {
          $in: ['recruit:category:Other', 'document:category:Other', 'tracker:category:Other'] as Ref<TagCategory>[]
        }
      })) as TagElement[]
      const regex = /^((?![a-zA-Zа-яА-Я]).)*$/g
      if (tagsToClean.length > 0) {
        for (const t of tagsToClean) {
          if (!regex.test(t.title)) continue
          const references = (await connection.findAll(tags.class.TagReference, {
            attachedToClass: recruit.mixin.Candidate,
            tag: t._id
          })) as TagReference[]
          const ids = references.map((r) => r._id)
          await db.collection<Doc>(DOMAIN_TAGS).deleteMany({ _id: { $in: ids } })
          await db.collection<Doc>(DOMAIN_TAGS).deleteOne({ _id: t._id })
        }
      }
      await fixCount()
      console.log('DONE 7 STEP')
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    client.close()
    await connection.close()
  }
}

function groupBy<T extends Doc> (docs: T[], key: string): Record<any, T[]> {
  return docs.reduce((storage: Record<string, T[]>, item: T) => {
    const group = getObjectValue(key, item) ?? undefined

    storage[group] = storage[group] ?? []
    storage[group].push(item)

    return storage
  }, {})
}

export async function restoreRecruitingTaskTypes (
  mongoUrl: string,
  workspaceId: WorkspaceUuid,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = getMongoClient(mongoUrl)
  try {
    const _client = await client.getClient()
    const db = getWorkspaceMongoDB(_client, workspaceId)

    // Query all vacancy project types creations (in Model)
    // We only update new project types in model here and not old ones in spaces
    const vacancyTypes = await connection.findAll<TxCreateDoc<ProjectType>>(core.class.TxCreateDoc, {
      objectClass: task.class.ProjectType,
      objectSpace: core.space.Model,
      'attributes.descriptor': recruit.descriptors.VacancyType
    })

    console.log('Found ', vacancyTypes.length, ' vacancy types to check')

    if (vacancyTypes.length === 0) {
      return
    }

    const descr = connection.getModel().getObject(recruit.descriptors.VacancyType)
    const knownCategories = [
      task.statusCategory.UnStarted,
      task.statusCategory.Active,
      task.statusCategory.Won,
      task.statusCategory.Lost
    ]

    function compareCategories (a: Ref<StatusCategory>, b: Ref<StatusCategory>): number {
      const indexOfA = knownCategories.indexOf(a)
      const indexOfB = knownCategories.indexOf(b)

      return indexOfA - indexOfB
    }

    for (const vacType of vacancyTypes) {
      for (const taskTypeId of vacType.attributes.tasks) {
        // Check if task type create TX exists
        const createTx = (
          await connection.findAll<TxCreateDoc<TaskType>>(core.class.TxCreateDoc, {
            objectClass: task.class.TaskType,
            objectSpace: core.space.Model,
            objectId: taskTypeId
          })
        )[0]

        console.log('####################################')
        console.log('Checking vacancy type: ', vacType.attributes.name)

        if (createTx !== undefined) {
          console.log('Task type already exists in model')
          continue
        }

        console.log('Restoring task type: ', taskTypeId, ' in vacancy type: ', vacType.attributes.name)

        // Restore create task type tx

        // Get target class mixin

        const typeMixin = (
          await connection.findAll<TxMixin<any, any>>(core.class.TxMixin, {
            mixin: task.mixin.TaskTypeClass,
            'attributes.projectType': vacType.objectId,
            'attributes.taskType': taskTypeId
          })
        )[0]

        if (typeMixin === undefined) {
          console.error(new Error('No type mixin found for the task type being restored'))
          continue
        }

        // Get statuses and categories
        const statusesIds = vacType.attributes.statuses.filter((s) => s.taskType === taskTypeId).map((s) => s._id)
        if (statusesIds.length === 0) {
          console.error(new Error('No statuses defined for the task type being restored'))
          continue
        }

        const statuses = await connection.findAll(core.class.Status, {
          _id: { $in: statusesIds }
        })
        const categoriesIds = new Set<Ref<StatusCategory>>()

        statuses.forEach((st) => {
          if (st.category !== undefined) {
            categoriesIds.add(st.category)
          }
        })

        if (categoriesIds.size === 0) {
          console.error(new Error('No categories found for the task type being restored'))
          continue
        }

        const statusCategories = Array.from(categoriesIds)

        statusCategories.sort(compareCategories)

        const createTxNew: TxCreateDoc<TaskType> = {
          _id: generateId(),
          _class: core.class.TxCreateDoc,
          space: core.space.Tx,
          objectId: taskTypeId,
          objectClass: task.class.TaskType,
          objectSpace: core.space.Model,
          modifiedBy: core.account.ConfigUser, // So it's not removed during the next migration
          modifiedOn: vacType.modifiedOn,
          createdOn: vacType.createdOn,
          attributes: {
            name: 'Applicant',
            descriptor: recruitModel.descriptors.Application,
            ofClass: recruit.class.Applicant,
            targetClass: typeMixin.objectId,
            statusClass: core.class.Status,
            allowedAsChildOf: [taskTypeId],
            statuses: statusesIds,
            statusCategories,
            parent: vacType.objectId,
            kind: 'both',
            icon: descr.icon
          }
        }

        await db.collection<Doc>(DOMAIN_TX).insertOne(createTxNew)
        console.log('Successfully created new task type: ')
        console.log(createTxNew)

        // If there were updates to the task type - move them to the model
        const updateTxes = (
          await connection.findAll(core.class.TxCUD, {
            objectClass: task.class.TaskType,
            objectSpace: vacType.objectId as any,
            objectId: taskTypeId
          })
        ).filter((tx) => [core.class.TxUpdateDoc, core.class.TxRemoveDoc].includes(tx._class))

        for (const updTx of updateTxes) {
          await db.collection<TxCUD<Doc>>(DOMAIN_TX).insertOne({
            ...updTx,
            _id: generateId(),
            objectSpace: core.space.Model
          })
        }
        console.log('Successfully restored ', updateTxes.length, ' CUD transactions')
      }
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    client.close()
    await connection.close()
  }
}

export async function restoreHrTaskTypesFromUpdates (
  mongoUrl: string,
  workspaceId: WorkspaceUuid,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = getMongoClient(mongoUrl)
  try {
    const _client = await client.getClient()
    const db = getWorkspaceMongoDB(_client, workspaceId)
    const hierarchy = connection.getHierarchy()
    const descr = connection.getModel().getObject(recruit.descriptors.VacancyType)
    const knownCategories = [
      task.statusCategory.UnStarted,
      task.statusCategory.Active,
      task.statusCategory.Won,
      task.statusCategory.Lost
    ]

    const supersededStatusesCursor = db.collection(DOMAIN_STATUS).find<Status>({ __superseded: true })
    const supersededStatusesById = toIdMap(await supersededStatusesCursor.toArray())

    // Query all vacancies
    const vacancies = await connection.findAll<Vacancy>(recruit.class.Vacancy, {})

    for (const vacancy of vacancies) {
      console.log('Checking vacancy: ', vacancy.name)
      // Find if task type exists
      const projectType = await connection.findOne<ProjectType>(task.class.ProjectType, {
        _id: vacancy.type
      })

      if (projectType !== undefined) {
        console.log('Found project type for vacancy: ', vacancy.name)
        continue
      }

      console.log('Restoring project type for: ', vacancy.name)

      const projectTypeId = generateId<ProjectType>()

      // Find task type from any task
      const applicant = await connection.findOne<Applicant>(recruit.class.Applicant, {
        space: vacancy._id
      })

      if (applicant === undefined) {
        // there are no tasks, just make it of the default system type
        console.log('No tasks found for the vacancy: ', vacancy.name)
        console.log('Changing vacancy to default type')
        await db
          .collection(DOMAIN_SPACE)
          .updateOne({ _id: vacancy._id }, { $set: { type: recruitModel.template.DefaultVacancy } })
        continue
      }

      const taskTypeId = applicant.kind

      // Check if there's a create transaction for the task type
      let createTaskTypeTx = await connection.findOne<TxCreateDoc<TaskType>>(core.class.TxCreateDoc, {
        objectId: taskTypeId
      })

      if (createTaskTypeTx === undefined) {
        // Restore it based on the update transaction
        const updateTaskTypeTx = await connection.findOne<TxUpdateDoc<TaskType>>(core.class.TxUpdateDoc, {
          objectId: taskTypeId,
          objectClass: task.class.TaskType,
          'operations.statuses': { $exists: true }
        })

        if (updateTaskTypeTx === undefined) {
          console.error(new Error('No task type found for the vacancy ' + vacancy.name))
          continue
        }

        const statuses =
          updateTaskTypeTx.operations.statuses?.map((s) => {
            const ssedStatus = supersededStatusesById.get(s)
            if (ssedStatus === undefined) {
              return s
            } else {
              const defStatus = defaultApplicantStatuses.find((st) => st.name === ssedStatus.name)

              if (defStatus === undefined) {
                console.error(new Error('No default status found for the superseded status ' + ssedStatus.name))
                return s
              }

              return defStatus.id
            }
          }) ?? []

        const taskTargetClassId = `${taskTypeId}:type:mixin` as Ref<Class<Task>>
        const ofClassClass = hierarchy.getClass(recruit.class.Applicant)

        await db.collection<TxCreateDoc<Doc>>(DOMAIN_TX).insertOne({
          _id: generateId(),
          _class: core.class.TxCreateDoc,
          space: core.space.Tx,
          objectId: taskTargetClassId,
          objectClass: core.class.Mixin,
          objectSpace: core.space.Model,
          modifiedBy: core.account.ConfigUser,
          modifiedOn: Date.now(),
          createdBy: core.account.ConfigUser,
          createdOn: Date.now(),
          attributes: {
            extends: recruit.class.Applicant,
            kind: ClassifierKind.MIXIN,
            label: ofClassClass.label,
            icon: ofClassClass.icon
          }
        })

        createTaskTypeTx = {
          _id: generateId(),
          _class: core.class.TxCreateDoc,
          space: core.space.Tx,
          objectId: taskTypeId,
          objectClass: task.class.TaskType,
          objectSpace: core.space.Model,
          modifiedBy: core.account.ConfigUser,
          modifiedOn: Date.now(),
          createdBy: core.account.ConfigUser,
          createdOn: Date.now(),
          attributes: {
            name: 'Applicant',
            descriptor: recruitModel.descriptors.Application,
            ofClass: recruit.class.Applicant,
            targetClass: taskTargetClassId,
            statusClass: core.class.Status,
            allowedAsChildOf: [taskTypeId],
            statuses,
            statusCategories: knownCategories,
            parent: projectTypeId,
            kind: 'task',
            icon: descr.icon
          }
        }

        await db.collection<TxCreateDoc<TaskType>>(DOMAIN_TX).insertOne(createTaskTypeTx)
        console.log('Restored task type id: ', taskTypeId)
      }

      // Restore the project type
      const targetClassId = `${projectTypeId}:type:mixin` as Ref<Class<Task>>
      const ofClassClass = hierarchy.getClass(recruit.class.Vacancy)

      await db.collection<TxCreateDoc<Doc>>(DOMAIN_TX).insertOne({
        _id: generateId(),
        _class: core.class.TxCreateDoc,
        space: core.space.Tx,
        objectId: targetClassId,
        objectClass: core.class.Mixin,
        objectSpace: core.space.Model,
        modifiedBy: core.account.ConfigUser,
        modifiedOn: Date.now(),
        createdBy: core.account.ConfigUser,
        createdOn: Date.now(),
        attributes: {
          extends: recruit.class.Vacancy,
          kind: ClassifierKind.MIXIN,
          label: ofClassClass.label,
          icon: ofClassClass.icon
        }
      })

      const createProjectTypeTx: TxCreateDoc<ProjectType> = {
        _id: generateId(),
        _class: core.class.TxCreateDoc,
        space: core.space.Tx,
        objectId: projectTypeId,
        objectClass: task.class.ProjectType,
        objectSpace: core.space.Model,
        modifiedBy: core.account.ConfigUser,
        modifiedOn: Date.now(),
        createdBy: core.account.ConfigUser,
        createdOn: Date.now(),
        attributes: {
          descriptor: recruit.descriptors.VacancyType,
          tasks: [taskTypeId],
          classic: true,
          statuses: createTaskTypeTx.attributes.statuses.map((s) => ({
            _id: s,
            taskType: taskTypeId
          })),
          targetClass: targetClassId,
          name: vacancy.name,
          description: '',
          roles: 0
        }
      }

      await db.collection<TxCreateDoc<ProjectType>>(DOMAIN_TX).insertOne(createProjectTypeTx)
      console.log('Restored project type id: ', projectTypeId)
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    client.close()
    await connection.close()
  }
}

export async function removeDuplicateIds (
  ctx: MeasureContext,
  mongodbUri: string,
  storageAdapter: StorageAdapter,
  accountsUrl: string,
  initWorkspacesStr: string
): Promise<void> {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const state = 'REMOVE_DUPLICATE_IDS'
  // const [accountsDb, closeAccountsDb] = await getAccountDB(mongodbUri)
  // const mongoClient = getMongoClient(mongodbUri)
  // const _client = await mongoClient.getClient()
  // // disable spaces while change hardocded ids
  // const skippedDomains: string[] = [DOMAIN_DOC_INDEX_STATE, DOMAIN_BENCHMARK, DOMAIN_TX, DOMAIN_SPACE]
  // try {
  //   const workspaces = await listWorkspacesRaw(accountsDb)
  //   workspaces.sort((a, b) => b.status.lastVisit - a.status.lastVisit)
  //   const initWorkspaces = initWorkspacesStr.split(';')
  //   const initWS = workspaces.filter((p) => initWorkspaces.includes(p.uuid))
  //   const ids = new Map<string, RelatedDocument[]>()
  //   for (const workspace of initWS) {
  //     const db = getWorkspaceMongoDB(_client, workspace.dataId)

  //     const txex = await db.collection(DOMAIN_TX).find<TxCUD<Doc>>({}).toArray()
  //     const txesArr = []
  //     for (const obj of txex) {
  //       if (obj.objectSpace === core.space.Model) {
  //         continue
  //       }
  //       txesArr.push({ _id: obj._id, _class: obj._class })
  //     }
  //     txesArr.filter((it, idx, array) => array.findIndex((pt) => pt._id === it._id) === idx)
  //     ids.set(DOMAIN_TX, txesArr)

  //     const colls = await db.collections()
  //     for (const coll of colls) {
  //       if (skippedDomains.includes(coll.collectionName)) continue
  //       const arr = ids.get(coll.collectionName) ?? []
  //       const data = await coll.find<RelatedDocument>({}, { projection: { _id: 1, _class: 1 } }).toArray()
  //       for (const obj of data) {
  //         arr.push(obj)
  //       }
  //       ids.set(coll.collectionName, arr)
  //     }

  //     const arr = ids.get(DOMAIN_MODEL) ?? []
  //     const data = await db
  //       .collection(DOMAIN_TX)
  //       .find<TxCUD<Doc>>(
  //       { objectSpace: core.space.Model },
  //       { projection: { objectId: 1, objectClass: 1, modifiedBy: 1 } }
  //     )
  //       .toArray()
  //     for (const obj of data) {
  //       if (obj.modifiedBy === core.account.ConfigUser || obj.modifiedBy === core.account.System) {
  //         continue
  //       }
  //       if (obj.objectId === core.account.ConfigUser || obj.objectId === core.account.System) continue
  //       arr.push({ _id: obj.objectId, _class: obj.objectClass })
  //     }
  //     arr.filter((it, idx, array) => array.findIndex((pt) => pt._id === it._id) === idx)
  //     ids.set(DOMAIN_MODEL, arr)
  //   }

  //   for (let index = 0; index < workspaces.length; index++) {
  //     const workspace = workspaces[index]
  //     // we should skip init workspace first time, for case if something went wrong
  //     if (initWorkspaces.includes(workspace.uuid)) continue

  //     ctx.info(`Processing workspace ${workspace.name ?? workspace.url ?? workspace.uuid}`)
  //     const workspaceId = workspace.uuid
  //     const db = getWorkspaceMongoDB(_client, workspace.dataId)
  //     const plugins = [workspace.uuid]
  //     if (workspace.dataId != null) {
  //       plugins.push(workspace.dataId)
  //     }

  //     const check = await db.collection(DOMAIN_MIGRATION).findOne({ state, plugin: { $in: plugins } })
  //     if (check != null) continue

  //     const endpoint = await getTransactorEndpoint(generateToken(systemAccountUuid, workspaceId, { service: 'tool' }))
  //     const wsClient = (await connect(endpoint, workspaceId, undefined, {
  //       model: 'upgrade'
  //     })) as CoreClient & BackupClient
  //     for (const set of ids) {
  //       if (set[1].length === 0) continue
  //       for (const doc of set[1]) {
  //         await updateId(ctx, wsClient, db, storageAdapter, workspaceId, doc)
  //       }
  //     }
  //     await wsClient.sendForceClose()
  //     await wsClient.close()
  //     await db.collection<MigrationState>(DOMAIN_MIGRATION).insertOne({
  //       _id: generateId(),
  //       state,
  //       plugin: workspace.uuid,
  //       space: core.space.Configuration,
  //       modifiedOn: Date.now(),
  //       modifiedBy: core.account.System,
  //       _class: core.class.MigrationState
  //     })
  //     ctx.info(`Done ${index} / ${workspaces.length - initWorkspaces.length}`)
  //   }
  // } catch (err: any) {
  //   console.trace(err)
  // } finally {
  //   mongoClient.close()
  //   closeAccountsDb()
  // }
}

// async function update<T extends Doc> (h: Hierarchy, db: Db, doc: T, update: DocumentUpdate<T>): Promise<void> {
//   await db
//     .collection(h.getDomain(doc._class))
//     .updateOne({ _id: doc._id }, { $set: { ...update, '%hash%': Date.now().toString(16) } })
// }

// async function updateId (
//   ctx: MeasureContext,
//   client: CoreClient & BackupClient,
//   db: Db,
//   storage: StorageAdapter,
//   workspaceId: WorkspaceId,
//   docRef: RelatedDocument
// ): Promise<void> {
//   const h = client.getHierarchy()
//   const txop = new TxOperations(client, core.account.System)
//   try {
//     // chech the doc exists
//     const doc = await client.findOne(docRef._class, { _id: docRef._id })
//     if (doc === undefined) return
//     const domain = h.getDomain(doc._class)
//     const newId = generateId()

//     // update txes
//     await db
//       .collection(DOMAIN_TX)
//       .updateMany({ objectId: doc._id }, { $set: { objectId: newId, '%hash%': Date.now().toString(16) } })

//     // update nested txes
//     await db
//       .collection(DOMAIN_TX)
//       .updateMany({ 'tx.objectId': doc._id }, { $set: { 'tx.objectId': newId, '%hash%': Date.now().toString(16) } })

//     // we have generated ids for calendar, let's update in
//     if (h.isDerived(doc._class, core.class.Account)) {
//       await updateId(ctx, client, db, storage, workspaceId, {
//         _id: `${doc._id}_calendar` as Ref<Doc>,
//         _class: calendar.class.Calendar
//       })
//     }

//     // update backlinks
//     const backlinks = await client.findAll(activity.class.ActivityReference, { attachedTo: doc._id })
//     for (const backlink of backlinks) {
//       const contentDoc = await client.findOne(backlink.attachedDocClass ?? backlink.srcDocClass, {
//         _id: backlink.attachedDocId ?? backlink.srcDocClass
//       })
//       if (contentDoc !== undefined) {
//         const attrs = h.getAllAttributes(contentDoc._class)
//         for (const [attrName, attr] of attrs) {
//           if (attr.type._class === core.class.TypeMarkup) {
//             const markup = (contentDoc as any)[attrName] as Markup
//             const newMarkup = markup.replaceAll(doc._id, newId)
//             await update(h, db, contentDoc, { [attrName]: newMarkup })
//           } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
//             const collabId = makeDocCollabId(contentDoc, attr.name)
//             await updateYDoc(ctx, collabId, storage, workspaceId, contentDoc, newId, doc)
//           }
//         }
//       }
//       await update(h, db, backlink, { attachedTo: newId, message: backlink.message.replaceAll(doc._id, newId) })
//     }

//     // blobs

//     await updateRefs(txop, newId, doc)

//     await updateArrRefs(txop, newId, doc)

//     // update docIndexState
//     const docIndexState = await client.findOne(core.class.DocIndexState, { doc: doc._id })
//     if (docIndexState !== undefined) {
//       const { _id, space, modifiedBy, modifiedOn, createdBy, createdOn, _class, ...data } = docIndexState
//       await txop.createDoc(docIndexState._class, docIndexState.space, {
//         ...data,
//         removed: false
//       })
//       await txop.update(docIndexState, { removed: true, needIndex: true })
//     }

//     if (domain !== DOMAIN_MODEL) {
//       const raw = await db.collection(domain).findOne({ _id: doc._id })
//       await db.collection(domain).insertOne({
//         ...raw,
//         _id: newId as any,
//         '%hash%': Date.now().toString(16)
//       })
//       await db.collection(domain).deleteOne({ _id: doc._id })
//     }
//   } catch (err: any) {
//     console.error('Error processing', docRef._id)
//   }
// }

// async function updateYDoc (
//   ctx: MeasureContext,
//   _id: CollaborativeDoc,
//   storage: StorageAdapter,
//   workspaceId: WorkspaceId,
//   contentDoc: Doc,
//   newId: Ref<Doc>,
//   doc: RelatedDocument
// ): Promise<void> {
//   try {
//     const ydoc = await loadCollabYdoc(ctx, storage, workspaceId, _id)
//     if (ydoc === undefined) {
//       ctx.error('document content not found', { document: contentDoc._id })
//       return
//     }
//     const buffer = yDocToBuffer(ydoc)

//     const updatedYDoc = updateYDocContent(buffer, (body: Record<string, any>) => {
//       const str = JSON.stringify(body)
//       const updated = str.replaceAll(doc._id, newId)
//       return JSON.parse(updated)
//     })

//     if (updatedYDoc !== undefined) {
//       await saveCollabYdoc(ctx, storage, workspaceId, _id, updatedYDoc)
//     }
//   } catch {
//     // do nothing, the collaborative doc does not sem to exist yet
//   }
// }

// async function updateRefs (client: TxOperations, newId: Ref<Doc>, doc: RelatedDocument): Promise<void> {
//   const h = client.getHierarchy()
//   const ancestors = h.getAncestors(doc._class)
//   const reftos = (await client.findAll(core.class.Attribute, { 'type._class': core.class.RefTo })).filter((it) => {
//     const to = it.type as RefTo<Doc>
//     return ancestors.includes(h.getBaseClass(to.to))
//   })
//   for (const attr of reftos) {
//     if (attr.name === '_id') {
//       continue
//     }
//     const descendants = h.getDescendants(attr.attributeOf)
//     for (const d of descendants) {
//       if (h.isDerived(d, core.class.BenchmarkDoc)) {
//         continue
//       }
//       if (h.isDerived(d, core.class.Tx)) {
//         continue
//       }
//       if (h.findDomain(d) !== undefined) {
//         while (true) {
//           const values = await client.findAll(d, { [attr.name]: doc._id }, { limit: 100 })
//           if (values.length === 0) {
//             break
//           }

//           const builder = client.apply(doc._id)
//           for (const v of values) {
//             await updateAttribute(builder, v, d, { key: attr.name, attr }, newId, true)
//           }
//           const modelTxes = builder.txes.filter((p) => p.objectSpace === core.space.Model)
//           builder.txes = builder.txes.filter((p) => p.objectSpace !== core.space.Model)
//           for (const modelTx of modelTxes) {
//             await client.tx(modelTx)
//           }
//           await builder.commit()
//         }
//       }
//     }
//   }
// }

// async function updateArrRefs (client: TxOperations, newId: Ref<Doc>, doc: RelatedDocument): Promise<void> {
//   const h = client.getHierarchy()
//   const ancestors = h.getAncestors(doc._class)
//   const arrs = await client.findAll(core.class.Attribute, { 'type._class': core.class.ArrOf })
//   for (const attr of arrs) {
//     if (attr.name === '_id') {
//       continue
//     }
//     const to = attr.type as ArrOf<Doc>
//     if (to.of._class !== core.class.RefTo) continue
//     const refto = to.of as RefTo<Doc>
//     if (ancestors.includes(h.getBaseClass(refto.to))) {
//       const descendants = h.getDescendants(attr.attributeOf)
//       for (const d of descendants) {
//         if (h.isDerived(d, core.class.BenchmarkDoc)) {
//           continue
//         }
//         if (h.isDerived(d, core.class.Tx)) {
//           continue
//         }
//         if (h.findDomain(d) !== undefined) {
//           while (true) {
//             const values = await client.findAll(attr.attributeOf, { [attr.name]: doc._id }, { limit: 100 })
//             if (values.length === 0) {
//               break
//             }
//             const builder = client.apply(doc._id)
//             for (const v of values) {
//               await updateAttribute(builder, v, d, { key: attr.name, attr }, newId, true)
//             }
//             const modelTxes = builder.txes.filter((p) => p.objectSpace === core.space.Model)
//             builder.txes = builder.txes.filter((p) => p.objectSpace !== core.space.Model)
//             for (const modelTx of modelTxes) {
//               await client.tx(modelTx)
//             }
//             await builder.commit()
//           }
//         }
//       }
//     }
//   }
// }
