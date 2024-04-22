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

import attachment from '@hcengineering/attachment'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import activity, { type DocUpdateMessage } from '@hcengineering/activity'
import contact from '@hcengineering/contact'
import core, {
  DOMAIN_TX,
  DOMAIN_STATUS,
  type MeasureContext,
  SortingOrder,
  TxOperations,
  TxProcessor,
  generateId,
  getObjectValue,
  type BackupClient,
  type Client as CoreClient,
  type Doc,
  type Domain,
  type Ref,
  type TxCreateDoc,
  type WorkspaceId,
  type StatusCategory,
  type TxMixin,
  type TxCUD,
  type Status,
  type TxUpdateDoc,
  type TxCollectionCUD,
  type Class,
  type Space
} from '@hcengineering/core'
import { getWorkspaceDB } from '@hcengineering/mongo'
import recruit, { type Applicant } from '@hcengineering/recruit'
import recruitModel, { defaultApplicantStatuses } from '@hcengineering/model-recruit'
import lead, { type Lead } from '@hcengineering/lead'
import leadModel, { defaultLeadStatuses } from '@hcengineering/model-lead'
import { type StorageAdapter } from '@hcengineering/server-core'
import { connect } from '@hcengineering/server-tool'
import tags, { type TagCategory, type TagElement, type TagReference } from '@hcengineering/tags'
import task, {
  type ProjectTypeDescriptor,
  type Task,
  type ProjectStatus,
  type ProjectType,
  type TaskType
} from '@hcengineering/task'
import tracker, { type Issue, classicIssueTaskStatuses, type Project } from '@hcengineering/tracker'
import trackerModel from '@hcengineering/model-tracker'
import { deepEqual } from 'fast-equals'

import { type Db, MongoClient } from 'mongodb'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TASK } from '@hcengineering/model-task'
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'

export async function cleanWorkspace (
  ctx: MeasureContext,
  mongoUrl: string,
  workspaceId: WorkspaceId,
  storageAdapter: StorageAdapter,
  elasticUrl: string,
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

    const attachments = await ops.findAll(attachment.class.Attachment, {})

    const contacts = await ops.findAll(contact.class.Contact, {})

    const files = new Set(
      attachments.map((it) => it.file).concat(contacts.map((it) => it.avatar).filter((it) => it) as string[])
    )

    const minioList = await storageAdapter.list(ctx, workspaceId)
    const toClean: string[] = []
    for (const mv of minioList) {
      if (!files.has(mv._id)) {
        toClean.push(mv._id)
      }
    }
    await storageAdapter.remove(ctx, workspaceId, toClean)
    // connection.loadChunk(DOMAIN_BLOB, idx = )

    if (opt.recruit) {
      const contacts = await ops.findAll(recruit.mixin.Candidate, {})
      console.log('removing Talents', contacts.length)
      const filter = contacts.filter((it) => !hierarchy.isDerived(it._class, contact.mixin.Employee))

      while (filter.length > 0) {
        const part = filter.splice(0, 100)
        const op = ops.apply('')
        for (const c of part) {
          await op.remove(c)
        }
        const t = Date.now()
        console.log('remove:', part.map((it) => it.name).join(', '))
        await op.commit()
        const t2 = Date.now()
        console.log('remove time:', t2 - t, filter.length)
      }

      // const vacancies = await ops.findAll(recruit.class.Vacancy, {})
      // console.log('removing vacancies', vacancies.length)
      // for (const c of vacancies) {
      //   console.log('Remove', c.name)
      //   await ops.remove(c)
      // }
    }

    if (opt.tracker) {
      const issues = await ops.findAll(tracker.class.Issue, {})
      console.log('removing Issues', issues.length)

      while (issues.length > 0) {
        const part = issues.splice(0, 5)
        const op = ops.apply('')
        for (const c of part) {
          await op.remove(c)
        }
        const t = Date.now()
        await op.commit()
        const t2 = Date.now()
        console.log('remove time:', t2 - t, issues.length)
      }
    }

    const client = new MongoClient(mongoUrl)
    try {
      await client.connect()
      const db = getWorkspaceDB(client, workspaceId)

      if (opt.removedTx) {
        const txes = await db.collection(DOMAIN_TX).find({}).toArray()

        for (const tx of txes) {
          if (tx._class === core.class.TxRemoveDoc) {
            // We need to remove all update and create operations for document
            await db.collection(DOMAIN_TX).deleteMany({ objectId: tx.objectId })
          }
        }
      }
    } finally {
      await client.close()
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

export async function fixMinioBW (
  ctx: MeasureContext,
  workspaceId: WorkspaceId,
  storageService: StorageAdapter
): Promise<void> {
  console.log('try clean bw miniature for ', workspaceId.name)
  const from = new Date(new Date().setDate(new Date().getDate() - 7)).getTime()
  const list = await storageService.list(ctx, workspaceId)
  console.log('found', list.length)
  let removed = 0
  for (const obj of list) {
    if (obj.modifiedOn < from) continue
    if ((obj._id as string).includes('%size%')) {
      await storageService.remove(ctx, workspaceId, [obj._id])
      removed++
      if (removed % 100 === 0) {
        console.log('removed: ', removed)
      }
    }
  }
  console.log('FINISH, removed: ', removed)
}

export async function cleanRemovedTransactions (workspaceId: WorkspaceId, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    let count = 0
    while (true) {
      const removedDocs = await connection.findAll(
        core.class.TxCollectionCUD,
        { 'tx._class': core.class.TxRemoveDoc },
        { limit: 1000 }
      )
      if (removedDocs.length === 0) {
        break
      }

      const toRemove = await connection.findAll(core.class.TxCollectionCUD, {
        'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxRemoveDoc, core.class.TxUpdateDoc] },
        'tx.objectId': { $in: removedDocs.map((it) => it.tx.objectId) }
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

export async function optimizeModel (workspaceId: WorkspaceId, transactorUrl: string): Promise<void> {
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
export async function cleanArchivedSpaces (workspaceId: WorkspaceId, transactorUrl: string): Promise<void> {
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

export async function fixCommentDoubleIdCreate (workspaceId: WorkspaceId, transactorUrl: string): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const commentTxes = await connection.findAll(core.class.TxCollectionCUD, {
      'tx._class': core.class.TxCreateDoc,
      'tx.objectClass': chunter.class.ChatMessage
    })
    const commentTxesRemoved = await connection.findAll(core.class.TxCollectionCUD, {
      'tx._class': core.class.TxRemoveDoc,
      'tx.objectClass': chunter.class.ChatMessage
    })
    const removed = new Map(commentTxesRemoved.map((it) => [it.tx.objectId, it]))
    // Do not checked removed
    const objSet = new Set<Ref<Doc>>()
    const oldValue = new Map<Ref<Doc>, string>()
    for (const c of commentTxes) {
      const cid = c.tx.objectId
      if (removed.has(cid)) {
        continue
      }
      const has = objSet.has(cid)
      objSet.add(cid)
      if (has) {
        // We have found duplicate one, let's rename it.
        const doc = TxProcessor.createDoc2Doc<ChatMessage>(c.tx as unknown as TxCreateDoc<ChatMessage>)
        if (doc.message !== '' && doc.message.trim() !== '<p></p>') {
          await connection.clean(DOMAIN_TX, [c._id])
          if (oldValue.get(cid) === doc.message.trim()) {
            console.log('delete tx', cid, doc.message)
          } else {
            oldValue.set(doc._id, doc.message)
            console.log('renaming', cid, doc.message)
            // Remove previous transaction.
            c.tx.objectId = generateId()
            doc._id = c.tx.objectId as Ref<ChatMessage>
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
  workspaceId: WorkspaceId,
  transactorUrl: string,
  step: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

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
    await client.close()
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
  workspaceId: WorkspaceId,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

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
    await client.close()
    await connection.close()
  }
}

export async function migrateTrackerDefaultStatuses (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

    const defaultTypeId = trackerModel.ids.ClassingProjectType
    const typeDescriptor = trackerModel.descriptors.ProjectType
    const baseClass = tracker.class.Project
    const defaultTaskTypeId = trackerModel.taskTypes.Issue
    const taskTypeClass = task.class.TaskType
    const baseTaskClass = tracker.class.Issue
    const getDefaultStatus = (oldStatus: Status): Ref<Status> | undefined => {
      const classicStatus = classicIssueTaskStatuses.find((c) => c.category === oldStatus.category)

      return classicStatus?.statuses[0][2] as Ref<Status>
    }
    const migrateProjects = async (getNewStatus: (oldStatus: Ref<Status>) => Ref<Status>): Promise<void> => {
      // Find projects of the default type
      // Default statuses in tracker are not reused anywhere else because they are created
      // with core.class.Status class while all other statuses are created with
      // tracker.class.IssueStatus class. So no need to account for these statuses to be
      // used anywhere else except the default project and task types.
      const affectedProjects = await connection.findAll<Project>(tracker.class.Project, {
        type: trackerModel.ids.ClassingProjectType
      })

      console.log('affectedProjects: ' + affectedProjects.length)

      // Project:
      // 1. defaultIssueStatus
      // 2. DocUpdateMessage:update:defaultIssueStatus
      for (const project of affectedProjects) {
        const newDefaultIssueStatus = getNewStatus(project.defaultIssueStatus)

        await db
          .collection(DOMAIN_SPACE)
          .updateOne({ _id: project._id }, { $set: { defaultIssueStatus: newDefaultIssueStatus } })

        const projectUpdateMessages = await connection.findAll<DocUpdateMessage>(activity.class.DocUpdateMessage, {
          action: 'update',
          objectId: project._id,
          'attributeUpdates.attrKey': 'defaultIssueStatus'
        })

        for (const updateMessage of projectUpdateMessages) {
          const statusSet = updateMessage.attributeUpdates?.set[0]
          const newStatusSet = statusSet != null ? getNewStatus(statusSet as Ref<Status>) : statusSet

          if (statusSet !== newStatusSet) {
            await db
              .collection(DOMAIN_ACTIVITY)
              .updateOne({ _id: updateMessage._id }, { $set: { 'attributeUpdates.set.0': newStatusSet } })
          }
        }
      }
    }

    await migrateDefaultStatuses<Issue>(connection, db, {
      defaultTypeId,
      typeDescriptor,
      baseClass,
      defaultTaskTypeId,
      taskTypeClass,
      baseTaskClass,
      getDefaultStatus,
      migrateProjects
    })
  } catch (err: any) {
    console.log(err.message)
    console.trace(err)
  } finally {
    await client.close()
    await connection.close()
  }
}

export async function migrateRecruitingDefaultStatuses (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

    const defaultTypeId = recruitModel.template.DefaultVacancy
    const typeDescriptor = recruitModel.descriptors.VacancyType
    const baseClass = recruit.class.Vacancy
    const defaultTaskTypeId = recruit.taskTypes.Applicant
    const taskTypeClass = task.class.TaskType
    const baseTaskClass = recruit.class.Applicant
    const getDefaultStatus = (oldStatus: Status): Ref<Status> | undefined => {
      return defaultApplicantStatuses.find(
        (defStatus) => defStatus.category === oldStatus.category && defStatus.name === oldStatus.name
      )?.id
    }

    await migrateDefaultStatuses<Applicant>(connection, db, {
      defaultTypeId,
      typeDescriptor,
      baseClass,
      defaultTaskTypeId,
      taskTypeClass,
      baseTaskClass,
      getDefaultStatus
    })
  } catch (err: any) {
    console.log(err.message)
    console.trace(err)
  } finally {
    await client.close()
    await connection.close()
  }
}

export async function migrateLeadsDefaultStatuses (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  transactorUrl: string
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient
  const client = new MongoClient(mongoUrl)
  try {
    await client.connect()
    const db = getWorkspaceDB(client, workspaceId)

    const defaultTypeId = leadModel.template.DefaultFunnel
    const typeDescriptor = leadModel.descriptors.FunnelType
    const baseClass = lead.class.Funnel
    const defaultTaskTypeId = leadModel.taskType.Lead
    const taskTypeClass = task.class.TaskType
    const baseTaskClass = lead.class.Lead
    const getDefaultStatus = (oldStatus: Status): Ref<Status> | undefined => {
      return defaultLeadStatuses.find(
        (defStatus) =>
          defStatus.category === oldStatus.category &&
          (defStatus.name === oldStatus.name || (defStatus.name === 'Negotiation' && oldStatus.name === 'Negotation'))
      )?.id
    }

    await migrateDefaultStatuses<Lead>(connection, db, {
      defaultTypeId,
      typeDescriptor,
      baseClass,
      defaultTaskTypeId,
      taskTypeClass,
      baseTaskClass,
      getDefaultStatus
    })
  } catch (err: any) {
    console.log(err.message)
    console.trace(err)
  } finally {
    await client.close()
    await connection.close()
  }
}

async function migrateDefaultStatuses<T extends Task> (
  connection: CoreClient & BackupClient,
  db: Db,
  options: {
    defaultTypeId: Ref<ProjectType>
    typeDescriptor: Ref<ProjectTypeDescriptor>
    baseClass: Ref<Class<Space>>
    defaultTaskTypeId: Ref<TaskType>
    taskTypeClass: Ref<Class<TaskType>>
    baseTaskClass: Ref<Class<T>>
    getDefaultStatus: (oldStatus: Status) => Ref<Status> | undefined
    migrateProjects?: (getNewStatus: (oldStatus: Ref<Status>) => Ref<Status>) => Promise<void>
  }
): Promise<void> {
  const {
    defaultTypeId,
    typeDescriptor,
    baseClass,
    defaultTaskTypeId,
    taskTypeClass,
    baseTaskClass,
    getDefaultStatus,
    migrateProjects
  } = options
  const h = connection.getHierarchy()
  const baseTaskClasses = h.getDescendants(tracker.class.Issue).filter((it) => !h.isMixin(it))

  let counter = 0
  // There are several cases possible based on the history of the workspace
  // 1. One system default type - pretty fresh or already migrated workspace.
  // Proceed with the regular scenario.
  // 2. One custom default type (modifiedBy user or ConfigUser) - migrated system type.
  // 2.a. If modified by ConfigUser - proceed with the regular scenario. Update to become modified by system.
  // 2.b. If modified by user - update to use the new ID of the type.
  // 3. More than one type (one system and one custom) - the tool is running after the WS upgrade.
  // Not supported for now. Alternatively - Proceed with (2) scenario for the custom one. Delete it in the end.

  const defaultTypes = await connection.findAll<TxCreateDoc<ProjectType>>(core.class.TxCreateDoc, {
    objectId: defaultTypeId,
    objectSpace: core.space.Model,
    'attributes.descriptor': typeDescriptor
  })

  if (defaultTypes.length === 2) {
    console.log('Are you running the tool after the workspace has been upgraded?')
    console.log('NOT SUPPORTED. EXITING.')
    return
  } else if (defaultTypes.length === 0) {
    console.log('No default type found. Was custom and already migrated? Nothing to do.')
    return
  }

  const defaultType = defaultTypes[0]

  console.log('**********************')
  console.log('Default type')
  console.log(defaultType)

  if (defaultType.modifiedBy !== core.account.System) {
    if (defaultType.modifiedBy === core.account.ConfigUser) {
      console.log('Moving the existing default type created by ConfigUser to a system one')

      // Most likely the task type is also modified by ConfigUser
      const defaultTaskType = await connection.findOne<TxCreateDoc<TaskType>>(core.class.TxCreateDoc, {
        objectId: defaultTaskTypeId,
        objectSpace: core.space.Model,
        'attributes.parent': defaultTypeId
      })

      if (defaultTaskType?.modifiedBy === core.account.ConfigUser) {
        console.log('Moving the existing default task type created by ConfigUser to a system one')
        await db.collection(DOMAIN_TX).updateOne(
          { _id: defaultTaskType._id },
          {
            $set: {
              modifiedBy: core.account.System
            }
          }
        )
      } else if (defaultTaskType?.modifiedBy !== core.account.System) {
        console.log('Default task type has been modified by user.')
        console.log('NOT SUPPORTED. EXITING.')
        return
      }

      await db.collection(DOMAIN_TX).updateOne(
        { _id: defaultType._id },
        {
          $set: {
            modifiedBy: core.account.System
          }
        }
      )
    } else {
      // modified by user
      // Update to use the new ID of the type if no default task type
      if (defaultType.attributes.tasks.includes(defaultTaskTypeId)) {
        console.log('Default type has been modified by user and it contains default task type')
        console.log('NOT SUPPORTED. EXITING.')
        return
      }
      console.log('Moving the existing default type to a custom one')
      const newId = defaultType.objectId + '-custom'
      await db.collection(DOMAIN_TX).updateOne(
        { _id: defaultType._id },
        {
          $set: {
            'attributes.name': defaultType.attributes.name + ' (custom)',
            objectId: newId
          }
        }
      )
      await db.collection(DOMAIN_TX).updateMany(
        {
          objectId: defaultType.objectId,
          objectSpace: core.space.Model
        },
        {
          $set: {
            objectId: newId
          }
        }
      )
      await db.collection(DOMAIN_TX).updateMany(
        {
          objectId: { $in: defaultType.attributes.tasks },
          objectSpace: core.space.Model,
          'attributes.parent': defaultTypeId
        },
        {
          $set: {
            'attributes.parent': newId
          }
        }
      )
      await db.collection(DOMAIN_SPACE).updateMany(
        {
          _class: baseClass,
          type: defaultTypeId
        },
        {
          $set: { type: newId }
        }
      )
      return
    }
  }

  // Find statuses for the default task type
  const existingTypeStatuses = defaultType.attributes.statuses.filter((s) => s.taskType === defaultTaskTypeId)

  if (existingTypeStatuses.length === 0) {
    console.log('No statuses found for the default task type')
    return
  }

  let oldStatusesIds = existingTypeStatuses.map((s) => (s as any).__oldId ?? s._id)

  // For each status find it's category and check if it's already been migrated
  const oldStatuses = await connection.findAll<Status>(core.class.Status, {
    _id: { $in: oldStatusesIds },
    __superseded: { $exists: false }
  })

  oldStatusesIds = oldStatusesIds.filter((s) => oldStatuses.find((os) => os._id === s) !== undefined)

  // Return if all statuses are the same
  if (oldStatusesIds.length === 0) {
    console.log('All statuses have been already migrated?')
    return
  }

  console.log('Old statuses')
  console.log(oldStatuses)

  // Build statuses mapping oldId -> {category, newId}
  const statusMapping: Record<Ref<Status>, any> = {}
  for (const s of oldStatuses) {
    const defaultStatusId = getDefaultStatus(s)

    if (defaultStatusId === undefined) {
      console.log('No default status found for the status being migrated: ' + s._id)
      console.log('EXITING')
      return
    }

    statusMapping[s._id] = {
      category: s.category,
      newId: defaultStatusId
    }
  }

  console.log('Status mapping')
  console.log(statusMapping)

  if (Object.entries(statusMapping).every(([oldId, { newId }]) => oldId === newId)) {
    console.log('All statuses have been already migrated or running on upgraded workspace')
    return
  }

  // Migration

  function getNewProjectStatus (status: ProjectStatus): ProjectStatus {
    const newId = statusMapping[status._id]?.newId

    if (newId === undefined) {
      return status
    }

    return { ...status, _id: newId }
  }

  function getNewStatus (status: Ref<Status>): Ref<Status> {
    return statusMapping[status]?.newId ?? status
  }

  // For default type
  // 1. Update create TX as it contains all the statuses right away
  // 2. Update all update TXes with statuses

  const newProjTypeStatuses = defaultType.attributes.statuses.map((ps) => {
    const newPs = getNewProjectStatus(ps)

    if (ps._id === newPs._id) {
      return {
        ...ps
      }
    }

    return {
      ...newPs,
      __oldId: ps._id
    }
  })

  console.log('newProjTypeStatuses')
  console.log(newProjTypeStatuses)

  if (
    !areSameArrays(
      oldStatuses.map((s) => s._id),
      newProjTypeStatuses.map((s) => s._id)
    )
  ) {
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: defaultType._id }, { $set: { 'attributes.statuses': newProjTypeStatuses } })
  } else {
    console.log('No need to update default type statuses')
  }

  const defaultTypeStatusesUpdates = await connection.findAll<TxUpdateDoc<ProjectType>>(core.class.TxUpdateDoc, {
    objectId: defaultTypeId,
    objectSpace: core.space.Model,
    'operations.statuses': { $exists: true }
  })

  console.log('defaultTypeStatusesUpdates: ' + defaultTypeStatusesUpdates.length)

  counter = 0
  for (const ptsUpdate of defaultTypeStatusesUpdates) {
    const newUpdateStatuses = ptsUpdate.operations.statuses?.map(getNewProjectStatus)

    if (areSameArrays(newUpdateStatuses, ptsUpdate.operations.statuses)) {
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: ptsUpdate._id }, { $set: { 'operations.statuses': newUpdateStatuses } })
  }
  console.log('defaultTypeStatusesUpdates updated: ' + counter)

  // For other types with the same descriptor
  // 1. Update all create TXes with statuses
  // 1. Update all update TXes with statuses
  // 2. Update all push TXes with statuses

  const otherTypeStatusesCreates = await connection.findAll<TxCreateDoc<ProjectType>>(core.class.TxCreateDoc, {
    objectId: { $ne: defaultTypeId },
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'attributes.descriptor': typeDescriptor
  })

  console.log('otherTypeStatusesCreates: ' + otherTypeStatusesCreates.length)

  counter = 0
  for (const ptsCreate of otherTypeStatusesCreates) {
    const newUpdateStatuses = ptsCreate.attributes.statuses?.map(getNewProjectStatus)

    if (areSameArrays(newUpdateStatuses, ptsCreate.attributes.statuses)) {
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: ptsCreate._id }, { $set: { 'attributes.statuses': newUpdateStatuses } })
  }
  console.log('otherTypeStatusesCreates updated: ' + counter)

  const otherTypeStatusesUpdates = await connection.findAll<TxUpdateDoc<ProjectType>>(core.class.TxUpdateDoc, {
    objectId: { $in: otherTypeStatusesCreates.map((sc) => sc.objectId) },
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'operations.statuses': { $exists: true }
  })
  console.log('otherTypeStatusesUpdates: ' + otherTypeStatusesUpdates.length)

  counter = 0
  for (const ptsUpdate of otherTypeStatusesUpdates) {
    const newUpdateStatuses = ptsUpdate.operations.statuses?.map(getNewProjectStatus)

    if (areSameArrays(newUpdateStatuses, ptsUpdate.operations.statuses)) {
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: ptsUpdate._id }, { $set: { 'operations.statuses': newUpdateStatuses } })
  }
  console.log('otherTypeStatusesUpdates updated: ' + counter)

  const otherTypeStatusesPushes = await connection.findAll<TxUpdateDoc<ProjectType>>(core.class.TxUpdateDoc, {
    objectId: { $in: otherTypeStatusesCreates.map((sc) => sc.objectId) },
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'operations.$push.statuses': { $exists: true }
  })

  console.log('otherTypeStatusesPushes: ' + otherTypeStatusesPushes.length)

  counter = 0
  for (const ptsUpdate of otherTypeStatusesPushes) {
    const pushedProjectStatus = ptsUpdate.operations.$push?.statuses
    if (pushedProjectStatus === undefined) {
      continue
    }

    const newPushStatus = getNewProjectStatus(pushedProjectStatus as ProjectStatus)

    if (pushedProjectStatus === newPushStatus) {
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: ptsUpdate._id }, { $set: { 'operations.$push.statuses': newPushStatus } })
  }
  console.log('otherTypeStatusesPushes updated: ' + counter)

  // All task types
  // 1. Update create TX
  // 2. Update all update TXes with statuses

  const allTaskTypes = await connection.findAll<TxCreateDoc<TaskType>>(core.class.TxCreateDoc, {
    objectClass: taskTypeClass,
    'attributes.ofClass': { $in: baseTaskClasses }
  })

  console.log('allTaskTypes: ' + allTaskTypes.length)

  counter = 0
  for (const taskType of allTaskTypes) {
    const newTaskTypeStatuses = taskType.attributes.statuses.map(getNewStatus)

    if (areSameArrays(newTaskTypeStatuses, taskType.attributes.statuses)) {
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: taskType._id }, { $set: { 'attributes.statuses': newTaskTypeStatuses } })
  }
  console.log('allTaskTypes updated: ' + counter)

  const allTaskTypeStatusesUpdates = await connection.findAll<TxUpdateDoc<TaskType>>(core.class.TxUpdateDoc, {
    objectClass: taskTypeClass,
    objectId: { $in: allTaskTypes.map((tt) => tt.objectId) },
    'operations.statuses': { $exists: true }
  })

  console.log('allTaskTypeStatusesUpdates: ' + allTaskTypeStatusesUpdates.length)

  counter = 0
  for (const ttsUpdate of allTaskTypeStatusesUpdates) {
    const newTaskTypeUpdateStatuses = ttsUpdate.operations.statuses?.map(getNewStatus)

    console.log('newTaskTypeUpdateStatuses for ' + ttsUpdate._id)
    console.log(newTaskTypeUpdateStatuses)

    if (areSameArrays(newTaskTypeUpdateStatuses, ttsUpdate.operations.statuses)) {
      console.log('Nothing to update')
      continue
    }

    counter++
    await db
      .collection(DOMAIN_TX)
      .updateOne({ _id: ttsUpdate._id }, { $set: { 'operations.statuses': newTaskTypeUpdateStatuses } })
  }
  console.log('allTaskTypeStatusesUpdates updated: ' + counter)

  await migrateProjects?.(getNewStatus)

  // For all Tasks:
  // 1. status
  // 2. TxCollectionCUD:TxCreateDoc
  // 3. TxCollectionCUD:TxUpdateDoc
  // 3. DocUpdateMessage:action:update&attributeUpdates:attrKey:status

  const affectedBaseTasks = await connection.findAll<T>(baseTaskClass, {
    status: { $in: oldStatusesIds }
  })

  console.log('affectedBaseTasks: ' + affectedBaseTasks.length)

  counter = 0
  for (const baseTask of affectedBaseTasks) {
    const newStatus = getNewStatus(baseTask.status)

    if (newStatus !== baseTask.status) {
      counter++
      await db.collection(DOMAIN_TASK).updateOne({ _id: baseTask._id }, { $set: { status: newStatus } })
    }
  }
  console.log('affectedBaseTasks updated: ' + counter)

  const baseTaskCreateTxes = await connection.findAll<TxCollectionCUD<T, T>>(core.class.TxCollectionCUD, {
    'tx._class': core.class.TxCreateDoc,
    'tx.objectClass': { $in: baseTaskClasses },
    'tx.attributes.status': { $in: oldStatusesIds }
  })

  console.log('Base task create TXes: ', baseTaskCreateTxes.length)

  counter = 0
  for (const baseTaskCreateTx of baseTaskCreateTxes) {
    const tx = baseTaskCreateTx.tx as TxCreateDoc<T>
    const newStatus = getNewStatus(tx.attributes.status)

    if (newStatus !== tx.attributes.status) {
      counter++
      await db
        .collection(DOMAIN_TX)
        .updateOne({ _id: baseTaskCreateTx._id }, { $set: { 'tx.attributes.status': newStatus } })
    }
  }
  console.log('Base task create TXes updated: ' + counter)

  const baseTaskUpdateTxes = await connection.findAll<TxCollectionCUD<T, T>>(core.class.TxCollectionCUD, {
    'tx._class': core.class.TxUpdateDoc,
    'tx.objectClass': { $in: baseTaskClasses },
    'tx.operations.status': { $in: oldStatusesIds }
  })

  console.log('Base task update TXes: ' + baseTaskUpdateTxes.length)

  counter = 0
  for (const baseTaskUpdateTx of baseTaskUpdateTxes) {
    const tx = baseTaskUpdateTx.tx as TxUpdateDoc<T>
    const newStatus = tx.operations.status !== undefined ? getNewStatus(tx.operations.status) : undefined

    if (newStatus !== tx.operations.status) {
      counter++
      await db
        .collection(DOMAIN_TX)
        .updateOne({ _id: baseTaskUpdateTx._id }, { $set: { 'tx.operations.status': newStatus } })
    }
  }
  console.log('Base task update TXes updated: ' + counter)

  const baseTaskUpdateMessages = await connection.findAll<DocUpdateMessage>(activity.class.DocUpdateMessage, {
    action: 'update',
    objectClass: { $in: baseTaskClasses },
    'attributeUpdates.attrKey': 'status',
    'attributeUpdates.set.0.': { $in: oldStatusesIds }
  })

  console.log('Base task update messages: ' + baseTaskUpdateMessages.length)

  counter = 0
  for (const updateMessage of baseTaskUpdateMessages) {
    const statusSet = updateMessage.attributeUpdates?.set[0]
    const newStatusSet = statusSet != null ? getNewStatus(statusSet as Ref<Status>) : statusSet

    if (statusSet !== newStatusSet) {
      counter++
      await db
        .collection(DOMAIN_ACTIVITY)
        .updateOne({ _id: updateMessage._id }, { $set: { 'attributeUpdates.set.0': newStatusSet } })
    }
  }
  console.log('Base task update messages updated: ' + counter)

  console.log('Updating statuses themselves:')
  counter = 0
  for (const oldStatus of oldStatuses) {
    const newStatus = getNewStatus(oldStatus._id)

    if (newStatus !== oldStatus._id) {
      console.log('Updating status from ' + oldStatus._id + ' to ' + newStatus)

      counter++
      await db.collection(DOMAIN_STATUS).updateOne({ _id: oldStatus._id }, { $set: { __superseded: true } })
      await db.collection(DOMAIN_STATUS).insertOne({
        ...oldStatus,
        _id: newStatus as any,
        __migratedFrom: oldStatus._id
      })
    }
  }
  console.log('Statuses updated: ' + counter)
}

function areSameArrays (arr1: any[] | undefined, arr2: any[] | undefined): boolean {
  if (arr1 === arr2) {
    return true
  }

  if (arr1 === undefined || arr2 === undefined) {
    return false
  }

  return arr1.length === arr2.length && arr1.every((elem, idx) => elem === arr2[idx])
}
