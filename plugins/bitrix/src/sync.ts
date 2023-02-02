import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { Comment } from '@hcengineering/chunter'
import contact, { combineName, EmployeeAccount } from '@hcengineering/contact'
import core, {
  AccountRole,
  ApplyOperations,
  AttachedDoc,
  Class,
  concatLink,
  Data,
  Doc,
  DocumentUpdate,
  FindResult,
  generateId,
  Hierarchy,
  Mixin,
  MixinUpdate,
  Ref,
  Space,
  TxOperations,
  TxProcessor,
  WithLookup
} from '@hcengineering/core'
import tags, { TagElement } from '@hcengineering/tags'
import { deepEqual } from 'fast-equals'
import { BitrixClient } from './client'
import bitrix from './index'
import {
  BitrixActivity,
  BitrixEntityMapping,
  BitrixEntityType,
  BitrixFieldMapping,
  BitrixSyncDoc,
  LoginInfo
} from './types'
import { convert, ConvertResult } from './utils'

async function updateDoc (client: ApplyOperations, doc: Doc, raw: Doc | Data<Doc>): Promise<Doc> {
  // We need to update fields if they are different.
  const documentUpdate: DocumentUpdate<Doc> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space', 'attachedTo', 'attachedToClass'].includes(k)) {
      continue
    }
    const dv = (doc as any)[k]
    if (!deepEqual(dv, v) && dv != null && v != null) {
      ;(documentUpdate as any)[k] = v
    }
  }
  if (Object.keys(documentUpdate).length > 0) {
    await client.update(doc, documentUpdate)
    TxProcessor.applyUpdate(doc, documentUpdate)
  }
  return doc
}

async function updateMixin (
  client: ApplyOperations,
  doc: Doc,
  raw: Doc | Data<Doc>,
  mixin: Ref<Class<Mixin<Doc>>>
): Promise<Doc> {
  // We need to update fields if they are different.
  const documentUpdate: MixinUpdate<Doc, Doc> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space', 'attachedTo', 'attachedToClass'].includes(k)) {
      continue
    }
    const dv = (doc as any)[k]
    if (!deepEqual(dv, v) && dv != null && v != null) {
      ;(documentUpdate as any)[k] = v
    }
  }
  if (Object.keys(documentUpdate).length > 0) {
    await client.updateMixin(doc._id, doc._class, doc.space, mixin, documentUpdate)
  }
  return doc
}

/**
 * @public
 */
export async function syncDocument (
  client: TxOperations,
  existing: Doc | undefined,
  resultDoc: ConvertResult,
  info: LoginInfo,
  frontUrl: string,
  monitor?: (doc: ConvertResult) => void
): Promise<void> {
  const hierarchy = client.getHierarchy()

  try {
    const applyOp = client.apply('bitrix')
    // const newDoc = existing === undefined
    existing = await updateMainDoc(applyOp)

    const mixins = { ...resultDoc.mixins }

    // Add bitrix sync mixin
    mixins[bitrix.mixin.BitrixSyncDoc] = {
      type: resultDoc.document.type,
      bitrixId: resultDoc.document.bitrixId,
      rawData: resultDoc.rawData,
      syncTime: Date.now()
    }

    // Check and update mixins
    await updateMixins(mixins, hierarchy, existing, applyOp, resultDoc.document)

    // Just create supplier documents, like TagElements.
    for (const ed of resultDoc.extraDocs) {
      await applyOp.createDoc(
        ed._class,
        ed.space,
        ed,
        ed._id,
        resultDoc.document.modifiedOn,
        resultDoc.document.modifiedBy
      )
    }

    // Find all attachemnt documents to existing.
    const byClass = new Map<Ref<Class<Doc>>, (AttachedDoc & BitrixSyncDoc)[]>()

    for (const d of resultDoc.extraSync) {
      byClass.set(d._class, [...(byClass.get(d._class) ?? []), d])
    }

    for (const [cl, vals] of byClass.entries()) {
      if (applyOp.getHierarchy().isDerived(cl, core.class.AttachedDoc)) {
        const existingByClass = await client.findAll(cl, {
          attachedTo: resultDoc.document._id,
          [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: vals.map((it) => it.bitrixId) }
        })

        for (const valValue of vals) {
          const existing = existingByClass.find(
            (it) => hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc).bitrixId === valValue.bitrixId
          )
          await updateAttachedDoc(existing, applyOp, valValue)
        }
      }
    }

    const existingBlobs = await client.findAll(attachment.class.Attachment, {
      attachedTo: resultDoc.document._id,
      [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: resultDoc.blobs.map((it) => it[0].bitrixId) }
    })
    for (const [ed, op] of resultDoc.blobs) {
      const existing = existingBlobs.find(
        (it) => hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc).bitrixId === ed.bitrixId
      )
      // For Attachments, just do it once per attachment and assume it is not changed.
      if (existing === undefined) {
        const attachmentId: Ref<Attachment> = generateId()
        try {
          const edData = await op()
          if (edData === undefined) {
            console.error('Failed to retrieve document data', ed.name)
            continue
          }
          const data = new FormData()
          data.append('file', edData)
          const resp = await fetch(concatLink(frontUrl, '/files'), {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + info.token
            },
            body: data
          })
          if (resp.status === 200) {
            const uuid = await resp.text()

            await applyOp.addCollection(
              attachment.class.Attachment,
              resultDoc.document.space,
              resultDoc.document._id,
              resultDoc.document._class,
              'attachments',
              {
                file: uuid,
                lastModified: edData.lastModified,
                name: edData.name,
                size: edData.size,
                type: edData.type
              },
              attachmentId,
              resultDoc.document.modifiedOn,
              resultDoc.document.modifiedBy
            )
          }
        } catch (err: any) {
          console.error(err)
        }
      }
    }
    await applyOp.commit()
  } catch (err: any) {
    console.error(err)
  }
  monitor?.(resultDoc)

  async function updateAttachedDoc (
    existing: WithLookup<Doc> | undefined,
    applyOp: ApplyOperations,
    valValue: AttachedDoc & BitrixSyncDoc
  ): Promise<void> {
    if (existing !== undefined) {
      // We need to update fields if they are different.
      existing = await updateDoc(applyOp, existing, valValue)
      const existingM = hierarchy.as(existing, bitrix.mixin.BitrixSyncDoc)
      await updateMixin(
        applyOp,
        existingM,
        {
          type: valValue.type,
          bitrixId: valValue.bitrixId,
          rawData: valValue.rawData
        },
        bitrix.mixin.BitrixSyncDoc
      )
    } else {
      const { bitrixId, rawData, ...data } = valValue
      await applyOp.addCollection<Doc, AttachedDoc>(
        valValue._class,
        valValue.space,
        valValue.attachedTo,
        valValue.attachedToClass,
        valValue.collection,
        data,
        valValue._id,
        valValue.modifiedOn,
        valValue.modifiedBy
      )

      await applyOp.createMixin<Doc, BitrixSyncDoc>(
        valValue._id,
        valValue._class,
        valValue.space,
        bitrix.mixin.BitrixSyncDoc,
        {
          type: valValue.type,
          bitrixId: valValue.bitrixId,
          rawData: valValue.rawData
        },
        valValue.modifiedOn,
        valValue.modifiedBy
      )
    }
  }

  async function updateMainDoc (applyOp: ApplyOperations): Promise<BitrixSyncDoc> {
    if (existing !== undefined) {
      // We need update doucment id.
      resultDoc.document._id = existing._id as Ref<BitrixSyncDoc>
      // We need to update fields if they are different.
      return (await updateDoc(applyOp, existing, resultDoc.document)) as BitrixSyncDoc
      // Go over extra documents.
    } else {
      const { bitrixId, rawData, ...data } = resultDoc.document
      const id = await applyOp.createDoc<Doc>(
        resultDoc.document._class,
        resultDoc.document.space,
        data,
        resultDoc.document._id,
        resultDoc.document.modifiedOn,
        resultDoc.document.modifiedBy
      )
      resultDoc.document._id = id as Ref<BitrixSyncDoc>

      return resultDoc.document
    }
  }
}

async function updateMixins (
  mixins: Record<Ref<Mixin<Doc>>, Data<Doc>>,
  hierarchy: Hierarchy,
  existing: Doc,
  applyOp: ApplyOperations,
  resultDoc: BitrixSyncDoc
): Promise<void> {
  for (const [m, mv] of Object.entries(mixins)) {
    const mRef = m as Ref<Mixin<Doc>>
    if (!hierarchy.hasMixin(existing, mRef)) {
      await applyOp.createMixin(
        resultDoc._id,
        resultDoc._class,
        resultDoc.space,
        m as Ref<Mixin<Doc>>,
        mv,
        resultDoc.modifiedOn,
        resultDoc.modifiedBy
      )
    } else {
      const existingM = hierarchy.as(existing, mRef)
      await updateMixin(applyOp, existingM, mv, mRef)
    }
  }
}

/**
 * @public
 */
export function processComment (comment: string): string {
  comment = comment.replaceAll('\n', '\n</br>')
  comment = comment.replaceAll(/\[(\/?[^[\]]+)]/gi, (text: string, args: string) => {
    if (args.startsWith('/URL')) {
      return '</a>'
    }

    if (args.startsWith('URL=')) {
      return `<a href="${args.substring(4)}">`
    }
    if (args.includes('/FONT')) {
      return '</span>'
    }
    if (args.includes('FONT')) {
      return `<span style="font: ${args.substring(4)};">`
    }

    if (args.includes('/SIZE')) {
      return '</span>'
    }
    if (args.includes('SIZE')) {
      return `<span style="font-size: ${args.substring(4)};">`
    }

    if (args.includes('/COLOR')) {
      return '</span>'
    }
    if (args.includes('COLOR')) {
      return `<span style="color: ${args.substring(5)};">`
    }

    if (args.includes('/IMG')) {
      return '"/>'
    }
    if (args.includes('IMG')) {
      return `<img ${args.substring(3)} src="`
    }

    if (args.includes('/TABLE')) {
      return '</table>'
    }
    if (args.includes('TABLE')) {
      return '<table>'
    }

    return `<${args}>`
  })
  return comment
}

// 1 day
const syncPeriod = 1000 * 60 * 60 * 24
/**
 * @public
 */
export async function performSynchronization (ops: {
  client: TxOperations
  bitrixClient: BitrixClient
  space: Ref<Space> | undefined
  mapping: WithLookup<BitrixEntityMapping>
  limit: number
  direction: 'ASC' | 'DSC'
  frontUrl: string
  loginInfo: LoginInfo
  monitor: (total: number) => void
  blobProvider?: (blobRef: any) => Promise<Blob | undefined>
}): Promise<void> {
  const commentFields = await ops.bitrixClient.call(BitrixEntityType.Comment + '.fields', {})

  const commentFieldKeys = Object.keys(commentFields.result)

  const allEmployee = await ops.client.findAll(contact.class.EmployeeAccount, {})

  const userList = new Map<string, Ref<EmployeeAccount>>()

  // Fill all users and create new ones, if required.
  await synchronizeUsers(userList, ops, allEmployee)

  try {
    if (ops.space === undefined || ops.mapping.$lookup?.fields === undefined) {
      return
    }
    let processed = 0

    let added = 0

    const sel = ['*', 'UF_*']
    if (ops.mapping.type === BitrixEntityType.Lead) {
      sel.push('EMAIL')
      sel.push('IM')
    }

    const allTagElements = await ops.client.findAll<TagElement>(tags.class.TagElement, {})

    while (added < ops.limit) {
      const result = await ops.bitrixClient.call(ops.mapping.type + '.list', {
        select: sel,
        order: { ID: ops.direction },
        start: processed
      })

      const fields = ops.mapping.$lookup?.fields as BitrixFieldMapping[]

      const toProcess = result.result as any[]
      const syncTime = Date.now()

      const existingDocuments = await ops.client.findAll<Doc>(ops.mapping.ofClass, {
        [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: toProcess.map((it) => `${it.ID as string}`) }
      })
      const defaultCategories = await ops.client.findAll(tags.class.TagCategory, {
        default: true
      })
      let synchronized = 0
      while (toProcess.length > 0) {
        console.log('LOAD:', synchronized, added)
        synchronized++
        const [r] = toProcess.slice(0, 1)

        const existingDoc = existingDocuments.find(
          (it) => ops.client.getHierarchy().as(it, bitrix.mixin.BitrixSyncDoc).bitrixId === r.ID
        )
        if (existingDoc !== undefined) {
          const bd = ops.client.getHierarchy().as(existingDoc, bitrix.mixin.BitrixSyncDoc)
          if (bd.syncTime !== undefined && bd.syncTime + syncPeriod > syncTime) {
            // No need to sync, sime sync time is not yet arrived.
            toProcess.splice(0, 1)
            added++
            ops.monitor?.(result.total)
            if (added >= ops.limit) {
              break
            }
            continue
          }
        }
        // Convert documents.
        try {
          const res = await convert(
            ops.client,
            ops.mapping,
            ops.space,
            fields,
            r,
            userList,
            existingDoc,
            defaultCategories,
            allTagElements,
            ops.blobProvider
          )

          if (ops.mapping.comments) {
            await downloadComments(res, ops, commentFieldKeys, userList)
          }

          added++
          const total = result.total
          await syncDocument(ops.client, existingDoc, res, ops.loginInfo, ops.frontUrl, () => {
            ops.monitor?.(total)
          })
          for (const d of res.extraDocs) {
            // update tags if required
            if (d._class === tags.class.TagElement) {
              allTagElements.push(d as TagElement)
            }
          }
          if (added >= ops.limit) {
            break
          }
        } catch (err: any) {
          console.log('failed to obtain data for', r, err)
          await new Promise((resolve) => {
            // Sleep for a while
            setTimeout(resolve, 1000)
          })
        }
        toProcess.splice(0, 1)
      }

      processed = result.next
    }
  } catch (err: any) {
    console.error(err)
  }
}
async function downloadComments (
  res: ConvertResult,
  ops: {
    client: TxOperations
    bitrixClient: BitrixClient
    space: Ref<Space> | undefined
    mapping: WithLookup<BitrixEntityMapping>
    limit: number
    direction: 'ASC' | 'DSC'
    frontUrl: string
    loginInfo: LoginInfo
    monitor: (total: number) => void
    blobProvider?: ((blobRef: any) => Promise<Blob | undefined>) | undefined
  },
  commentFieldKeys: string[],
  userList: Map<string, Ref<EmployeeAccount>>
): Promise<void> {
  const commentsData = await ops.bitrixClient.call(BitrixEntityType.Comment + '.list', {
    filter: {
      ENTITY_ID: res.document.bitrixId,
      ENTITY_TYPE: ops.mapping.type.replace('crm.', '')
    },
    select: commentFieldKeys,
    order: { ID: ops.direction }
  })
  for (const it of commentsData.result) {
    const c: Comment & { bitrixId: string, type: string } = {
      _id: generateId(),
      _class: chunter.class.Comment,
      message: processComment(it.COMMENT as string),
      bitrixId: it.ID,
      type: it.ENTITY_TYPE,
      attachedTo: res.document._id,
      attachedToClass: res.document._class,
      collection: 'comments',
      space: res.document.space,
      modifiedBy: userList.get(it.AUTHOR_ID) ?? core.account.System,
      modifiedOn: new Date(it.CREATED ?? new Date().toString()).getTime()
    }
    res.extraSync.push(c)
  }
  const communications = await ops.bitrixClient.call('crm.activity.list', {
    order: { ID: 'DESC' },
    filter: {
      OWNER_ID: res.document.bitrixId
    },
    select: ['*', 'COMMUNICATIONS']
  })
  const cr = Array.isArray(communications.result)
    ? (communications.result as BitrixActivity[])
    : [communications.result as BitrixActivity]
  for (const comm of cr) {
    const c: Comment & { bitrixId: string, type: string } = {
      _id: generateId(),
      _class: chunter.class.Comment,
      message: `e-mail:<br/> 
                            Subject: ${comm.SUBJECT}
                            ${comm.DESCRIPTION}`,
      bitrixId: comm.ID,
      type: 'email',
      attachedTo: res.document._id,
      attachedToClass: res.document._class,
      collection: 'comments',
      space: res.document.space,
      modifiedBy: userList.get(comm.AUTHOR_ID) ?? core.account.System,
      modifiedOn: new Date(comm.CREATED ?? new Date().toString()).getTime()
    }
    res.extraSync.push(c)
  }
}

async function synchronizeUsers (
  userList: Map<string, Ref<EmployeeAccount>>,
  ops: {
    client: TxOperations
    bitrixClient: BitrixClient
    space: Ref<Space> | undefined
    mapping: WithLookup<BitrixEntityMapping>
    limit: number
    direction: 'ASC' | 'DSC'
    frontUrl: string
    loginInfo: LoginInfo
    monitor: (total: number) => void
    blobProvider?: ((blobRef: any) => Promise<Blob | undefined>) | undefined
  },
  allEmployee: FindResult<EmployeeAccount>
): Promise<void> {
  let totalUsers = 1
  let next = 0
  while (userList.size < totalUsers) {
    const users = await ops.bitrixClient.call('user.search', { start: next })
    next = users.next
    totalUsers = users.total
    for (const u of users.result) {
      let accountId = allEmployee.find((it) => it.email === u.EMAIL)?._id
      if (accountId === undefined) {
        const employeeId = await ops.client.createDoc(contact.class.Employee, contact.space.Contacts, {
          name: combineName(u.NAME, u.LAST_NAME),
          avatar: u.PERSONAL_PHOTO,
          active: u.ACTIVE,
          city: u.PERSONAL_CITY
        })
        accountId = await ops.client.createDoc(contact.class.EmployeeAccount, core.space.Model, {
          email: u.EMAIL,
          name: combineName(u.NAME, u.LAST_NAME),
          employee: employeeId,
          role: AccountRole.User
        })
      }
      userList.set(u.ID, accountId)
    }
  }
}
