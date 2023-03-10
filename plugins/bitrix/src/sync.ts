import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { Comment } from '@hcengineering/chunter'
import contact, { Channel, combineName, Contact, EmployeeAccount } from '@hcengineering/contact'
import core, {
  Account,
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
  MixinData,
  MixinUpdate,
  Ref,
  Space,
  Timestamp,
  TxOperations,
  TxProcessor,
  WithLookup
} from '@hcengineering/core'
import gmail, { Message } from '@hcengineering/gmail'
import tags, { TagElement } from '@hcengineering/tags'
import { deepEqual } from 'fast-equals'
import { BitrixClient } from './client'
import bitrix from './index'
import {
  BitrixActivity,
  BitrixEntityMapping,
  BitrixEntityType,
  BitrixFieldMapping,
  BitrixFiles,
  BitrixOwnerType,
  BitrixSyncDoc,
  LoginInfo
} from './types'
import { convert, ConvertResult } from './utils'

async function updateDoc (client: ApplyOperations, doc: Doc, raw: Doc | Data<Doc>, date: Timestamp): Promise<Doc> {
  // We need to update fields if they are different.
  const documentUpdate: DocumentUpdate<Doc> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space', 'attachedTo', 'attachedToClass'].includes(k)) {
      continue
    }
    const dv = (doc as any)[k]
    if (!deepEqual(dv, v) && v != null) {
      ;(documentUpdate as any)[k] = v
    }
  }
  if (Object.keys(documentUpdate).length > 0) {
    await client.update(doc, documentUpdate, false, date, doc.modifiedBy)
    TxProcessor.applyUpdate(doc, documentUpdate)
  }
  return doc
}

async function updateMixin (
  client: ApplyOperations,
  doc: Doc,
  raw: Doc | Data<Doc>,
  mixin: Ref<Class<Mixin<Doc>>>,
  modifiedBy: Ref<Account>,
  modifiedOn: Timestamp
): Promise<Doc> {
  // We need to update fields if they are different.

  if (!client.getHierarchy().hasMixin(doc, mixin)) {
    await client.createMixin(doc._id, doc._class, doc.space, mixin, raw as MixinData<Doc, Doc>, modifiedOn, modifiedBy)
    return doc
  }

  const documentUpdate: MixinUpdate<Doc, Doc> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space', 'attachedTo', 'attachedToClass'].includes(k)) {
      continue
    }
    const dv = (doc as any)[k]
    if (!deepEqual(dv, v) && v != null) {
      ;(documentUpdate as any)[k] = v
    }
  }
  if (Object.keys(documentUpdate).length > 0) {
    await client.updateMixin(doc._id, doc._class, doc.space, mixin, documentUpdate, modifiedOn, modifiedBy)
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

    // Find all attachment documents to existing.
    const byClass = new Map<Ref<Class<Doc>>, (AttachedDoc & BitrixSyncDoc)[]>()

    const idMapping = new Map<Ref<Doc>, Ref<Doc>>()
    for (const d of resultDoc.extraSync) {
      byClass.set(d._class, [...(byClass.get(d._class) ?? []), d])
    }

    for (const [cl, vals] of byClass.entries()) {
      await syncClass(applyOp, cl, vals, idMapping, resultDoc.document._id)
    }

    // Sync gmail documents
    const emailAccount = resultDoc.extraSync.find(
      (it) =>
        it._class === contact.class.Channel && (it as unknown as Channel).provider === contact.channelProvider.Email
    )
    if (resultDoc.gmailDocuments.length > 0 && emailAccount !== undefined) {
      const emailReadId = idMapping.get(emailAccount._id) ?? emailAccount._id
      await syncClass(applyOp, gmail.class.Message, resultDoc.gmailDocuments, idMapping, emailReadId)
    }

    const attachIds = Array.from(
      new Set(resultDoc.blobs.map((it) => idMapping.get(it[0].attachedTo) ?? it[0].attachedTo)).values()
    )

    const existingBlobs = await client.findAll(attachment.class.Attachment, {
      attachedTo: { $in: [resultDoc.document._id, ...attachIds] }
    })
    for (const [ed, op, upd] of resultDoc.blobs) {
      const existing = existingBlobs.find((it) => {
        const bdoc = hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc)
        return bdoc.bitrixId === ed.bitrixId
      })
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

          upd(edData, ed)

          ed.lastModified = edData.lastModified
          ed.size = edData.size
          ed.type = edData.type

          let updated = false
          for (const existingObj of existingBlobs) {
            if (existingObj.name === ed.name && existingObj.size === ed.size && existingObj.type === ed.type) {
              if (!updated) {
                await updateAttachedDoc(existingObj, applyOp, ed)
                updated = true
              } else {
                // Remove duplicate attachment
                await applyOp.remove(existingObj)
              }
            }
          }

          if (!updated) {
            // No attachment, send to server
            const resp = await fetch(concatLink(frontUrl, '/files'), {
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + info.token
              },
              body: data
            })
            if (resp.status === 200) {
              const uuid = await resp.text()

              ed.file = uuid
              ed._id = attachmentId as Ref<Attachment & BitrixSyncDoc>

              await updateAttachedDoc(undefined, applyOp, ed)
            }
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

  async function syncClass (
    applyOp: ApplyOperations,
    cl: Ref<Class<Doc>>,
    vals: (AttachedDoc & BitrixSyncDoc)[],
    idMapping: Map<Ref<Doc>, Ref<Doc>>,
    attachedTo: Ref<Doc>
  ): Promise<void> {
    if (applyOp.getHierarchy().isDerived(cl, core.class.AttachedDoc)) {
      const existingByClass = await client.findAll(cl, {
        attachedTo
      })

      for (const valValue of vals) {
        const id = idMapping.get(valValue.attachedTo)
        if (id !== undefined) {
          valValue.attachedTo = id
        } else {
          // Update document id, for existing document.
          valValue.attachedTo = resultDoc.document._id
        }
        const existingIdx = existingByClass.findIndex((it) => {
          const bdoc = hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc)
          return bdoc.bitrixId === valValue.bitrixId && bdoc.type === valValue.type
        })
        let existing: Doc | undefined
        if (existingIdx >= 0) {
          existing = existingByClass.splice(existingIdx, 1).shift()
          if (existing !== undefined) {
            idMapping.set(valValue._id, existing._id)
          }
        }
        await updateAttachedDoc(existing, applyOp, valValue)
      }

      // Remove previous merged documents, probable they are deleted in bitrix or wrongly migrated.
      for (const doc of existingByClass) {
        await applyOp.remove(doc)
      }
    }
  }

  async function updateAttachedDoc (
    existing: WithLookup<Doc> | undefined,
    applyOp: ApplyOperations,
    valValue: AttachedDoc & BitrixSyncDoc
  ): Promise<void> {
    if (existing !== undefined) {
      // We need to update fields if they are different.
      existing = await updateDoc(applyOp, existing, valValue, Date.now())
      const existingM = hierarchy.as(existing, bitrix.mixin.BitrixSyncDoc)
      await updateMixin(
        applyOp,
        existingM,
        {
          type: valValue.type,
          bitrixId: valValue.bitrixId,
          rawData: valValue.rawData
        },
        bitrix.mixin.BitrixSyncDoc,
        valValue.modifiedBy,
        valValue.modifiedOn
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
      return (await updateDoc(applyOp, existing, resultDoc.document, resultDoc.document.modifiedOn)) as BitrixSyncDoc
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
      await updateMixin(applyOp, existingM, mv, mRef, resultDoc.modifiedBy, resultDoc.modifiedOn)
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

/**
 * @public
 */
export const defaultSyncPeriod = 1000 * 60 * 60 * 24

/**
 * @public
 */
export interface SyncOptions {
  client: TxOperations
  bitrixClient: BitrixClient
  space: Ref<Space> | undefined
  mapping: WithLookup<BitrixEntityMapping>
  limit: number
  direction: 'ASC' | 'DSC'
  frontUrl: string
  loginInfo: LoginInfo
  monitor: (total: number) => void
  blobProvider?: (blobRef: { file: string, id: string }) => Promise<Blob | undefined>
  extraFilter?: Record<string, any>
  syncPeriod?: number
}
interface SyncOptionsExtra {
  ownerTypeValues: BitrixOwnerType[]
  commentFieldKeys: string[]
  allMappings: FindResult<BitrixEntityMapping>
  allEmployee: FindResult<EmployeeAccount>
  userList: Map<string, Ref<EmployeeAccount>>
}

/**
 * @public
 */
export async function performSynchronization (ops: SyncOptions): Promise<BitrixSyncDoc[]> {
  const commentFields = await ops.bitrixClient.call(BitrixEntityType.Comment + '.fields', {})

  const ownerTypes = await ops.bitrixClient.call('crm.enum.ownertype', {})

  const ownerTypeValues = ownerTypes.result as BitrixOwnerType[]

  const commentFieldKeys = Object.keys(commentFields.result)

  const allEmployee = await ops.client.findAll(contact.class.EmployeeAccount, {})

  const allMappings = await ops.client.findAll<BitrixEntityMapping>(
    bitrix.class.EntityMapping,
    {},
    {
      lookup: {
        _id: {
          fields: bitrix.class.FieldMapping
        }
      }
    }
  )

  const userList = new Map<string, Ref<EmployeeAccount>>()

  // Fill all users and create new ones, if required.
  await synchronizeUsers(userList, ops, allEmployee)

  return await doPerformSync({
    ...ops,
    ownerTypeValues,
    commentFieldKeys,
    allMappings,
    allEmployee,
    userList
  })
}

async function doPerformSync (ops: SyncOptions & SyncOptionsExtra): Promise<BitrixSyncDoc[]> {
  const resultDocs: BitrixSyncDoc[] = []

  try {
    if (ops.space === undefined || ops.mapping.$lookup?.fields === undefined) {
      return []
    }
    let processed = 0

    let added = 0

    const sel = ['*', 'UF_*', 'EMAIL', 'IM', 'WEB']

    const allTagElements = await ops.client.findAll<TagElement>(tags.class.TagElement, {})

    while (added < ops.limit) {
      const q: Record<string, any> = {
        select: sel,
        order: { ID: ops.direction },
        start: processed
      }
      if (ops.extraFilter !== undefined) {
        q.filter = ops.extraFilter
      }
      const result = await ops.bitrixClient.call(ops.mapping.type + '.list', q)

      const fields = ops.mapping.$lookup?.fields as BitrixFieldMapping[]

      const toProcess = result.result as any[]
      const syncTime = Date.now()

      const existingDocuments = await ops.client.findAll<Doc>(ops.mapping.ofClass, {
        [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: toProcess.map((it) => `${it.ID as string}`) },
        [bitrix.mixin.BitrixSyncDoc + '.type']: ops.mapping.type
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
          if (bd.syncTime !== undefined && bd.syncTime + (ops.syncPeriod ?? defaultSyncPeriod) > syncTime) {
            // No need to sync, same sync time is not yet arrived.
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
            ops.userList,
            existingDoc,
            defaultCategories,
            allTagElements,
            ops.blobProvider
          )

          if (ops.mapping.comments) {
            await downloadComments(res, ops, ops.commentFieldKeys, ops.userList, ops.ownerTypeValues)
          }

          added++
          const total = result.total

          if (res.syncRequests.length > 0) {
            for (const r of res.syncRequests) {
              const m = ops.allMappings.find((it) => it.type === r.type)
              if (m !== undefined) {
                const [d] = await doPerformSync({
                  ...ops,
                  mapping: m,
                  extraFilter: { ID: r.bitrixId },
                  monitor: (total) => {
                    console.log('total', total)
                  }
                })
                if (d !== undefined) {
                  r.update(d._id)
                }
              }
            }
          }

          await syncDocument(ops.client, existingDoc, res, ops.loginInfo, ops.frontUrl, () => {
            ops.monitor?.(total)
          })
          if (existingDoc !== undefined) {
            res.document._id = existingDoc._id as Ref<BitrixSyncDoc>
          }
          resultDocs.push(res.document)
          for (const d of res.extraDocs) {
            // update tags if required
            if (d._class === tags.class.TagElement) {
              allTagElements.push(d as TagElement)
            }
          }

          if (ops.mapping.type === BitrixEntityType.Company) {
            // We need to perform contact mapping if they are defined.
            const contactMapping = ops.allMappings.find((it) => it.type === BitrixEntityType.Contact)
            if (contactMapping !== undefined) {
              await performOrganizationContactSynchronization(
                {
                  ...ops,
                  mapping: contactMapping,
                  limit: 100
                },
                {
                  res
                }
              )
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
      if (processed === undefined) {
        // No more elements
        break
      }
    }
  } catch (err: any) {
    console.error(err)
  }
  return resultDocs
}

async function performOrganizationContactSynchronization (
  ops: SyncOptions & SyncOptionsExtra,
  extra: {
    res: ConvertResult
  }
): Promise<void> {
  const contacts = await doPerformSync({
    ...ops,
    extraFilter: { COMPANY_ID: extra.res.document.bitrixId },
    monitor: (total) => {
      console.log('total', total)
    }
  })
  const existingMembers = await ops.client.findAll(contact.class.Member, {
    attachedTo: extra.res.document._id
  })
  for (const c of contacts) {
    const ex = existingMembers.findIndex((e) => e.contact === (c._id as unknown as Ref<Contact>))
    if (ex === -1) {
      await ops.client.addCollection(
        contact.class.Member,
        extra.res.document.space,
        extra.res.document._id,
        extra.res.document._class,
        'members',
        {
          contact: c._id as unknown as Ref<Contact>
        }
      )
    } else {
      // remove from list
      existingMembers.splice(ex, 1)
    }
  }
  // Remove not expected members
  for (const ex of existingMembers) {
    await ops.client.remove(ex)
  }

  // We need to create Member's for organization contacts.
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
    blobProvider?: ((blobRef: { file: string, id: string }) => Promise<Blob | undefined>) | undefined
  },
  commentFieldKeys: string[],
  userList: Map<string, Ref<EmployeeAccount>>,
  ownerTypeValues: BitrixOwnerType[]
): Promise<void> {
  const entityType = ops.mapping.type.replace('crm.', '')
  const ownerType = ownerTypeValues.find((it) => it.SYMBOL_CODE.toLowerCase() === entityType)
  if (ownerType === undefined) {
    throw new Error(`No owner type found for ${entityType}`)
  }
  const commentsData = await ops.bitrixClient.call(BitrixEntityType.Comment + '.list', {
    filter: {
      ENTITY_ID: res.document.bitrixId,
      ENTITY_TYPE: entityType
    },
    select: commentFieldKeys,
    order: { ID: ops.direction }
  })
  for (const it of commentsData.result) {
    const c: Comment & BitrixSyncDoc = {
      _id: generateId(),
      _class: chunter.class.Comment,
      message: processComment(it.COMMENT as string),
      bitrixId: `${it.ID as string}`,
      type: it.ENTITY_TYPE,
      rawData: it,
      attachedTo: res.document._id,
      attachedToClass: res.document._class,
      collection: 'comments',
      space: res.document.space,
      modifiedBy: userList.get(it.AUTHOR_ID) ?? core.account.System,
      modifiedOn: new Date(it.CREATED ?? new Date().toString()).getTime(),
      attachments: 0
    }
    if (Object.keys(it.FILES ?? {}).length > 0) {
      for (const [, v] of Object.entries(it.FILES as BitrixFiles)) {
        c.message += `</br> Attachment: <a href='${v.urlDownload}'>${v.name} by ${v.authorName}</a>`
        // Direct link, we could download using fetch.
        c.attachments = (c.attachments ?? 0) + 1
        res.blobs.push([
          {
            _id: generateId(),
            _class: attachment.class.Attachment,
            attachedTo: c._id,
            attachedToClass: c._class,
            bitrixId: `attach-${v.id}`,
            collection: 'attachments',
            file: '',
            lastModified: Date.now(),
            modifiedBy: userList.get(it.AUTHOR_ID) ?? core.account.System,
            modifiedOn: new Date(it.CREATED ?? new Date().toString()).getTime(),
            name: v.name,
            size: v.size,
            space: c.space,
            type: 'file'
          },
          async (): Promise<File | undefined> => {
            const blob = await ops.blobProvider?.({ file: v.urlDownload, id: `${v.id}` })
            if (blob !== undefined) {
              return new File([blob], v.name)
            }
          },
          (file: File, attach: Attachment) => {
            attach.attachedTo = c._id
            attach.type = file.type
            attach.size = file.size
            attach.name = file.name
          }
        ])
      }
    }
    res.extraSync.push(c)
  }

  const emailAccount = res.extraSync.find(
    (it) => it._class === contact.class.Channel && (it as unknown as Channel).provider === contact.channelProvider.Email
  )
  if (emailAccount !== undefined) {
    const communications = await ops.bitrixClient.call('crm.activity.list', {
      order: { ID: 'DESC' },
      filter: {
        OWNER_ID: res.document.bitrixId,
        OWNER_TYPE_ID: ownerType.ID
      },
      select: ['*', 'COMMUNICATIONS']
    })
    const cr = Array.isArray(communications.result)
      ? (communications.result as BitrixActivity[])
      : [communications.result as BitrixActivity]
    for (const comm of cr) {
      if (comm.PROVIDER_TYPE_ID === 'EMAIL') {
        const parser = new DOMParser()

        const c: Message & BitrixSyncDoc = {
          _id: generateId(),
          _class: gmail.class.Message,
          content: comm.DESCRIPTION,
          textContent:
            parser.parseFromString(comm.DESCRIPTION, 'text/html').textContent?.split('\n').slice(0, 3).join('\n') ?? '',
          incoming: comm.DIRECTION === '1',
          sendOn: new Date(comm.CREATED ?? new Date().toString()).getTime(),
          subject: comm.SUBJECT,
          bitrixId: `${comm.ID}`,
          rawData: comm,
          from: comm.SETTINGS?.EMAIL_META?.from ?? '',
          to: comm.SETTINGS?.EMAIL_META?.to ?? '',
          replyTo: comm.SETTINGS?.EMAIL_META?.replyTo ?? comm.SETTINGS?.MESSAGE_HEADERS?.['Reply-To'] ?? '',
          messageId: comm.SETTINGS?.MESSAGE_HEADERS?.['Message-Id'] ?? '',
          attachedTo: emailAccount._id as unknown as Ref<Channel>,
          attachedToClass: emailAccount._class,
          collection: 'items',
          space: res.document.space,
          modifiedBy: userList.get(comm.AUTHOR_ID) ?? core.account.System,
          modifiedOn: new Date(comm.CREATED ?? new Date().toString()).getTime()
        }
        res.gmailDocuments.push(c)
      }
    }
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
    blobProvider?: ((blobRef: { file: string, id: string }) => Promise<Blob | undefined>) | undefined
  },
  allEmployee: FindResult<EmployeeAccount>
): Promise<void> {
  let totalUsers = 1
  let next = 0

  const employees = new Map((await ops.client.findAll(contact.class.Employee, {})).map((it) => [it._id, it]))

  while (userList.size < totalUsers) {
    const users = await ops.bitrixClient.call('user.search', { start: next })
    next = users.next
    totalUsers = users.total
    for (const u of users.result) {
      const account = allEmployee.find((it) => it.email === u.EMAIL)
      let accountId = account?._id
      if (accountId === undefined) {
        const employeeId = await ops.client.createDoc(contact.class.Employee, contact.space.Contacts, {
          name: combineName(u.NAME, u.LAST_NAME),
          avatar: u.PERSONAL_PHOTO,
          active: u.ACTIVE,
          city: u.PERSONAL_CITY,
          createOn: Date.now()
        })
        accountId = await ops.client.createDoc(contact.class.EmployeeAccount, core.space.Model, {
          email: u.EMAIL,
          name: combineName(u.NAME, u.LAST_NAME),
          employee: employeeId,
          role: AccountRole.User
        })
        if (u.EMAIL !== undefined && u.EMAIL !== null) {
          await ops.client.addCollection(
            contact.class.Channel,
            contact.space.Contacts,
            employeeId,
            contact.class.Employee,
            'channels',
            {
              provider: contact.channelProvider.Email,
              value: u.EMAIL.trim()
            }
          )
        }
        await ops.client.createMixin<Doc, BitrixSyncDoc>(
          employeeId,
          contact.class.Employee,
          contact.space.Contacts,
          bitrix.mixin.BitrixSyncDoc,
          {
            type: 'employee',
            bitrixId: `${u.ID as string}`,
            syncTime: Date.now()
          }
        )
      } else if (account != null) {
        const emp = employees.get(account.employee)
        if (emp !== undefined && !ops.client.getHierarchy().hasMixin(emp, bitrix.mixin.BitrixSyncDoc)) {
          await ops.client.createMixin<Doc, BitrixSyncDoc>(emp._id, emp._class, emp.space, bitrix.mixin.BitrixSyncDoc, {
            type: 'employee',
            bitrixId: `${u.ID as string}`,
            syncTime: Date.now()
          })
        }
      }
      userList.set(u.ID, accountId)
    }
  }
}
