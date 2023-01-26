import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { Comment } from '@hcengineering/chunter'
import contact, { combineName, EmployeeAccount } from '@hcengineering/contact'
import core, {
  AccountRole,
  ApplyOperations,
  AttachedDoc,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  generateId,
  Mixin,
  Ref,
  Space,
  TxOperations,
  WithLookup
} from '@hcengineering/core'
import tags, { TagElement } from '@hcengineering/tags'
import { deepEqual } from 'fast-equals'
import { BitrixClient } from './client'
import { BitrixEntityMapping, BitrixEntityType, BitrixFieldMapping, BitrixSyncDoc, LoginInfo } from './types'
import { convert, ConvertResult } from './utils'
import bitrix from './index'

async function updateDoc (client: ApplyOperations, doc: Doc, raw: Doc | Data<Doc>): Promise<void> {
  // We need to update fields if they are different.
  const documentUpdate: DocumentUpdate<Doc> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space'].includes(k)) {
      continue
    }
    if (!deepEqual((doc as any)[k], v)) {
      ;(documentUpdate as any)[k] = v
    }
  }
  if (Object.keys(documentUpdate).length > 0) {
    await client.update(doc, documentUpdate)
  }
}

/**
 * @public
 */
export async function syncPlatform (
  client: TxOperations,
  mapping: BitrixEntityMapping,
  documents: ConvertResult[],
  info: LoginInfo,
  frontUrl: string,
  monitor?: (doc: ConvertResult) => void
): Promise<void> {
  const existingDocuments = await client.findAll(mapping.ofClass, {
    [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: documents.map((it) => it.document.bitrixId) }
  })
  const hierarchy = client.getHierarchy()
  let syncronized = 0
  for (const d of documents) {
    try {
      const existing = existingDocuments.find(
        (it) => hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc).bitrixId === d.document.bitrixId
      )
      const applyOp = client.apply('bitrix')
      if (existing !== undefined) {
        // We need update doucment id.
        d.document._id = existing._id as Ref<BitrixSyncDoc>
        // We need to update fields if they are different.
        await updateDoc(applyOp, existing, d.document)

        // Check and update mixins
        for (const [m, mv] of Object.entries(d.mixins)) {
          const mRef = m as Ref<Mixin<Doc>>
          if (hierarchy.hasMixin(existing, mRef)) {
            await applyOp.createMixin(
              d.document._id,
              d.document._class,
              d.document.space,
              m as Ref<Mixin<Doc>>,
              mv,
              d.document.modifiedOn,
              d.document.modifiedBy
            )
          } else {
            const existingM = hierarchy.as(existing, mRef)
            await updateDoc(applyOp, existingM, mv)
          }
        }
      } else {
        await applyOp.createDoc(
          d.document._class,
          d.document.space,
          d.document,
          d.document._id,
          d.document.modifiedOn,
          d.document.modifiedBy
        )

        await applyOp.createMixin<Doc, BitrixSyncDoc>(
          d.document._id,
          d.document._class,
          d.document.space,
          bitrix.mixin.BitrixSyncDoc,
          {
            type: d.document.type,
            bitrixId: d.document.bitrixId
          },
          d.document.modifiedOn,
          d.document.modifiedBy
        )
        for (const [m, mv] of Object.entries(d.mixins)) {
          await applyOp.createMixin(
            d.document._id,
            d.document._class,
            d.document.space,
            m as Ref<Mixin<Doc>>,
            mv,
            d.document.modifiedOn,
            d.document.modifiedBy
          )
        }
        for (const ed of d.extraDocs) {
          if (applyOp.getHierarchy().isDerived(ed._class, core.class.AttachedDoc)) {
            const adoc = ed as AttachedDoc
            await applyOp.addCollection(
              adoc._class,
              adoc.space,
              adoc.attachedTo,
              adoc.attachedToClass,
              adoc.collection,
              adoc,
              adoc._id,
              d.document.modifiedOn,
              d.document.modifiedBy
            )
          } else {
            await applyOp.createDoc(ed._class, ed.space, ed, ed._id, d.document.modifiedOn, d.document.modifiedBy)
          }
        }

        for (const ed of d.blobs) {
          const attachmentId: Ref<Attachment> = generateId()

          const data = new FormData()
          data.append('file', ed)
          const resp = await fetch(frontUrl + '/files', {
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
              d.document.space,
              d.document._id,
              d.document._class,
              'attachments',
              {
                file: uuid,
                lastModified: ed.lastModified,
                name: ed.name,
                size: ed.size,
                type: ed.type
              },
              attachmentId,
              d.document.modifiedOn,
              d.document.modifiedBy
            )
          }
        }

        if (d.comments !== undefined) {
          const comments = await d.comments
          if (comments !== undefined && comments.length > 0) {
            const existingComments = await client.findAll(chunter.class.Comment, {
              attachedTo: d.document._id,
              [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: comments.map((it) => it.bitrixId) }
            })

            for (const comment of comments) {
              const existing = existingComments.find(
                (it) => hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc).bitrixId === comment.bitrixId
              )
              if (existing !== undefined) {
                // We need to update fields if they are different.
                await updateDoc(applyOp, existing, comment)
              } else {
                await applyOp.addCollection(
                  comment._class,
                  comment.space,
                  comment.attachedTo,
                  comment.attachedToClass,
                  comment.collection,
                  comment,
                  comment._id,
                  comment.modifiedOn,
                  comment.modifiedBy
                )

                await applyOp.createMixin<Doc, BitrixSyncDoc>(
                  comment._id,
                  comment._class,
                  comment.space,
                  bitrix.mixin.BitrixSyncDoc,
                  {
                    type: d.document.type,
                    bitrixId: d.document.bitrixId
                  },
                  comment.modifiedOn,
                  comment.modifiedBy
                )
              }
            }
          }
        }
      }
      await applyOp.commit()
    } catch (err: any) {
      console.error(err)
    }
    console.log('SYNC:', syncronized, documents.length - syncronized)
    syncronized++
    monitor?.(d)
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
}): Promise<void> {
  const commentFields = await ops.bitrixClient.call(BitrixEntityType.Comment + '.fields', {})

  const commentFieldKeys = Object.keys(commentFields.result)

  const allEmployee = await ops.client.findAll(contact.class.EmployeeAccount, {})

  const userList = new Map<string, Ref<EmployeeAccount>>()

  // Fill all users and create new ones, if required.
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

  try {
    if (ops.space === undefined || ops.mapping.$lookup?.fields === undefined) {
      return
    }
    let processed = 0
    const tagElements: Map<Ref<Class<Doc>>, TagElement[]> = new Map()

    let added = 0

    while (added < ops.limit) {
      const sel = ['*', 'UF_*']
      if (ops.mapping.type === BitrixEntityType.Lead) {
        sel.push('EMAIL')
        sel.push('IM')
      }
      const result = await ops.bitrixClient.call(ops.mapping.type + '.list', {
        select: sel,
        order: { ID: ops.direction },
        start: processed
      })

      const extraDocs: Doc[] = []

      const convertResults: ConvertResult[] = []
      const fields = ops.mapping.$lookup?.fields as BitrixFieldMapping[]

      const toProcess = result.result as any[]

      const existingDocuments = await ops.client.findAll(
        ops.mapping.ofClass,
        {
          [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: toProcess.map((it) => `${it.ID as string}`) }
        },
        {
          projection: {
            _id: 1,
            [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: 1
          }
        }
      )
      const defaultCategories = await ops.client.findAll(tags.class.TagCategory, {
        default: true
      })
      let synchronized = 0
      while (toProcess.length > 0) {
        console.log('LOAD:', synchronized, toProcess.length)
        synchronized++
        const [r] = toProcess.slice(0, 1)
        // Convert documents.
        try {
          const res = await convert(
            ops.client,
            ops.mapping,
            ops.space,
            fields,
            r,
            extraDocs,
            tagElements,
            userList,
            existingDocuments,
            defaultCategories
          )
          if (ops.mapping.comments) {
            res.comments = await ops.bitrixClient
              .call(BitrixEntityType.Comment + '.list', {
                filter: {
                  ENTITY_ID: res.document.bitrixId,
                  ENTITY_TYPE: ops.mapping.type.replace('crm.', '')
                },
                select: commentFieldKeys,
                order: { ID: ops.direction }
              })
              .then((comments) => {
                return comments.result.map((it: any) => {
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
                  return c
                })
              })
          }
          convertResults.push(res)
          extraDocs.push(...res.extraDocs)
          added++
          if (added >= ops.limit) {
            break
          }
        } catch (err: any) {
          console.log('failed to obtain data for', r)
          await new Promise((resolve) => {
            // Sleep for a while
            setTimeout(resolve, 1000)
          })
        }
        toProcess.splice(0, 1)
      }
      const total = result.total
      await syncPlatform(ops.client, ops.mapping, convertResults, ops.loginInfo, ops.frontUrl, () => {
        ops.monitor?.(total)
      })

      processed = result.next
    }
  } catch (err: any) {
    console.error(err)
  }
}
