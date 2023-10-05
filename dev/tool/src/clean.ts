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
import chunter, { Comment } from '@hcengineering/chunter'
import contact from '@hcengineering/contact'
import { deepEqual } from 'fast-equals'
import core, {
  BackupClient,
  Client as CoreClient,
  DOMAIN_TX,
  Doc,
  Domain,
  Ref,
  SortingOrder,
  TxCreateDoc,
  TxOperations,
  TxProcessor,
  WorkspaceId,
  generateId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { getWorkspaceDB } from '@hcengineering/mongo'
import recruit from '@hcengineering/recruit'
import { connect } from '@hcengineering/server-tool'
import tracker from '@hcengineering/tracker'
import { MongoClient } from 'mongodb'

export const DOMAIN_COMMENT = 'comment' as Domain

export async function cleanWorkspace (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  minio: MinioService,
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

    const minioList = await minio.list(workspaceId)
    const toClean: string[] = []
    for (const mv of minioList) {
      if (!files.has(mv.name)) {
        toClean.push(mv.name)
      }
    }
    await minio.remove(workspaceId, toClean)
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
      'tx.objectClass': chunter.class.Comment
    })
    const commentTxesRemoved = await connection.findAll(core.class.TxCollectionCUD, {
      'tx._class': core.class.TxRemoveDoc,
      'tx.objectClass': chunter.class.Comment
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
        const doc = TxProcessor.createDoc2Doc<Comment>(c.tx as unknown as TxCreateDoc<Comment>)
        if (doc.message !== '' && doc.message.trim() !== '<p></p>') {
          await connection.clean(DOMAIN_TX, [c._id])
          if (oldValue.get(cid) === doc.message.trim()) {
            console.log('delete tx', cid, doc.message)
          } else {
            oldValue.set(doc._id, doc.message)
            console.log('renaming', cid, doc.message)
            // Remove previous transaction.
            c.tx.objectId = generateId()
            doc._id = c.tx.objectId as Ref<Comment>
            await connection.upload(DOMAIN_TX, [c])
            // Also we need to create snapsot
            await connection.upload(DOMAIN_COMMENT, [doc])
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
