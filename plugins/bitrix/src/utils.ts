import attachment, { Attachment } from '@hcengineering/attachment'
import contact, { Channel, PersonAccount, Organization } from '@hcengineering/contact'
import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  Client,
  Data,
  Doc,
  DocumentUpdate,
  Mixin,
  Ref,
  RefTo,
  Space,
  TxOperations,
  WithLookup,
  generateId
} from '@hcengineering/core'
import { Message } from '@hcengineering/gmail'
import recruit, { Applicant, Candidate, Vacancy } from '@hcengineering/recruit'
import tags, { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
import task from '@hcengineering/task'
import bitrix, {
  BitrixEntityMapping,
  BitrixEntityType,
  BitrixFieldMapping,
  BitrixStateMapping,
  BitrixSyncDoc,
  CopyValueOperation,
  CreateChannelOperation,
  CreateHRApplication,
  CreateTagOperation,
  DownloadAttachmentOperation,
  FindReferenceOperation,
  MappingOperation,
  SyncOptions
} from '.'
import { createApplication, createVacancy } from './hr'

/**
 * @public
 */
export function collectFields (fieldMapping: BitrixFieldMapping[]): string[] {
  const fields: string[] = ['ID']
  for (const f of fieldMapping) {
    switch (f.operation.kind) {
      case MappingOperation.CopyValue:
        fields.push(
          ...Array.from(f.operation.patterns.map((it) => it.field).filter((it) => it !== undefined) as string[])
        )
        break
      case MappingOperation.CreateChannel:
        fields.push(...Array.from(f.operation.fields.map((it) => it.field).filter((it) => it !== undefined)))
        break
      case MappingOperation.CreateTag:
        fields.push(...Array.from(f.operation.fields.map((it) => it.field).filter((it) => it !== undefined)))
        break
    }
  }
  return fields
}

/**
 * @public
 */
export interface BitrixSyncRequest {
  type: BitrixEntityType
  bitrixId: string
  update: (doc: Ref<Doc>) => void
}

/**
 * @public
 */
export type PostOperation = (
  doc: ConvertResult,
  extraDocs: Map<Ref<Class<Doc>>, Doc[]>,
  ops: SyncOptions,
  existing?: Doc
) => Promise<void>

/**
 * @public
 */
export interface ConvertResult {
  document: BitrixSyncDoc // Document we should sync
  mixins: Record<Ref<Mixin<Doc>>, Data<Doc>> // Mixins of document we will sync
  extraDocs: Doc[] // Extra documents we will sync, etc.
  extraSync: (AttachedDoc & BitrixSyncDoc)[] // Extra documents we will sync, etc.
  gmailDocuments: (Message & BitrixSyncDoc)[]
  blobs: [Attachment & BitrixSyncDoc, () => Promise<File | undefined>, (file: File, attach: Attachment) => void][]
  syncRequests: BitrixSyncRequest[]
  postOperations: PostOperation[]
}

/**
 * @public
 */
export async function convert (
  client: Client,
  entity: BitrixEntityMapping,
  space: Ref<Space>,
  fields: BitrixFieldMapping[],
  rawDocument: any,
  userList: Map<string, Ref<PersonAccount>>,
  existingDoc: WithLookup<Doc> | undefined,
  defaultCategories: TagCategory[],
  allTagElements: TagElement[],
  blobProvider?: (blobRef: { file: string, id: string }) => Promise<Blob | undefined>
): Promise<ConvertResult> {
  const hierarchy = client.getHierarchy()
  const bitrixId = `${rawDocument.ID as string}`
  const document: BitrixSyncDoc = {
    _id: generateId(),
    type: entity.type,
    bitrixId,
    _class: entity.ofClass,
    space,
    modifiedOn: new Date(rawDocument.DATE_CREATE).getTime(),
    modifiedBy: userList.get(rawDocument.CREATED_BY_ID) ?? core.account.System
  }

  const existingId = existingDoc?._id

  // Obtain a proper modified by for document

  const newExtraSyncDocs: (AttachedDoc & BitrixSyncDoc)[] = []
  const newExtraDocs: Doc[] = []
  const blobs: [
    Attachment & BitrixSyncDoc,
    () => Promise<File | undefined>,
    (file: File, attach: Attachment) => void
  ][] = []
  const mixins: Record<Ref<Mixin<Doc>>, Data<Doc>> = {}

  const postOperations: PostOperation[] = []

  // Fill required mixins.
  for (const m of entity.mixins ?? []) {
    mixins[m] = {}
  }

  const syncRequests: BitrixSyncRequest[] = []

  const extractValue = (field?: string, alternatives?: string[]): any | undefined => {
    if (field !== undefined) {
      let lval = rawDocument[field]
      if ((lval == null || lval === '') && alternatives !== undefined) {
        for (const alt of alternatives) {
          lval = rawDocument[alt]
          if (lval != null) {
            break
          }
        }
      }
      const bfield = entity.bitrixFields[field]
      if (bfield === undefined) {
        console.trace('Bitrix field not found', field)
      } else if (bfield.type === 'integer' || bfield.type === 'double') {
        if (bfield.isMultiple && Array.isArray(lval)) {
          return lval[0] ?? 0
        }
        return lval
      } else if (bfield.type === 'crm_multifield') {
        if (lval != null && Array.isArray(lval)) {
          return lval.map((it) => ({ value: it.VALUE, type: it.VALUE_TYPE.toLowerCase() }))
        } else if (lval != null) {
          return [{ value: lval.VALUE, type: lval.VALUE_TYPE.toLowerCase() }]
        }
      } else if (bfield.type === 'file') {
        if (Array.isArray(lval) && bfield.isMultiple) {
          return lval.map((it) => ({ id: `${it.id as string}`, file: it.downloadUrl }))
        } else if (lval != null) {
          return [{ id: `${lval.id as string}`, file: lval.downloadUrl }]
        }
      } else if (bfield.type === 'string' || bfield.type === 'url' || bfield.type === 'crm_company') {
        if (bfield.isMultiple && Array.isArray(lval)) {
          return lval.join(', ')
        }
        return lval
      } else if (bfield.type === 'date') {
        if (lval !== '' && lval != null) {
          return new Date(lval).getTime()
        }
      } else if (bfield.type === 'char') {
        return lval === 'Y'
      } else if (bfield.type === 'enumeration' || bfield.type === 'crm_status') {
        if (lval != null && lval !== '') {
          if (bfield.isMultiple) {
            const results: any[] = []
            for (let llval of Array.isArray(lval) ? lval : [lval]) {
              if (typeof llval === 'number') {
                llval = llval.toString()
              }
              const eValue = bfield.items?.find((it) => it.ID === llval)?.VALUE
              if (eValue !== undefined) {
                results.push(eValue)
              }
            }
            return results
          } else {
            if (typeof lval === 'number') {
              lval = lval.toString()
            }
            const eValue = bfield.items?.find((it) => it.ID === lval)?.VALUE
            if (eValue !== undefined) {
              return eValue
            }
          }
        }
      } else {
        return lval
      }
    }
  }

  const getCopyValue = async (attr: AnyAttribute, operation: CopyValueOperation): Promise<any> => {
    const r: Array<string | number | boolean | Date> = []
    for (const o of operation.patterns) {
      if (o.text.length > 0) {
        r.push(o.text)
      }
      const lval = extractValue(o.field, o.alternatives)
      if (lval != null) {
        if (Array.isArray(lval)) {
          r.push(...lval)
        } else {
          r.push(lval)
        }
      }
    }
    if (r.length === 0) {
      return
    }

    if (attr.type._class === core.class.ArrOf) {
      return r
    }
    if (r.length === 1) {
      return r[0]
    }

    return r.join('').trim()
  }
  const getDownloadValue = async (
    attr: AnyAttribute,
    operation: DownloadAttachmentOperation
  ): Promise<{ id: string, file: string }[]> => {
    const files: Array<{ id: string, file: string }> = []
    for (const o of operation.fields) {
      const lval = extractValue(o.field)
      if (lval != null) {
        if (Array.isArray(lval)) {
          files.push(...lval)
        } else {
          files.push(lval)
        }
      }
    }
    return files
  }

  const getChannelValue = async (attr: AnyAttribute, operation: CreateChannelOperation): Promise<any> => {
    for (const f of operation.fields) {
      const lval = extractValue(f.field)
      if (lval != null && lval !== '') {
        const vals = Array.isArray(lval) ? lval : [lval]
        for (const llVal of vals) {
          let svalue: string = typeof llVal === 'string' ? llVal : llVal.value

          if (typeof llVal === 'string') {
            if (f.include != null || f.exclude != null) {
              if (f.include !== undefined && svalue.match(f.include) == null) {
                continue
              }
              if (f.exclude !== undefined && svalue.match(f.exclude) != null) {
                continue
              }
            }
          } else {
            // TYPE matching to category.
            if (f.provider === contact.channelProvider.Telegram && llVal.type !== 'telegram') {
              continue
            }
            if (f.provider === contact.channelProvider.Whatsapp && llVal.type !== 'whatsapp') {
              continue
            }
            if (f.provider === contact.channelProvider.Twitter && llVal.type !== 'twitter') {
              continue
            }
            if (f.provider === contact.channelProvider.LinkedIn && llVal.type !== 'linkedin') {
              continue
            }

            // Fixes
            if (f.provider === contact.channelProvider.Telegram) {
              if (!svalue.startsWith('@') && !/^\d+/.test(svalue)) {
                svalue = '@' + svalue
              }
            }
          }
          const existingC = newExtraSyncDocs
            .filter((it) => it._class === contact.class.Channel)
            .map((it) => it as unknown as Channel)
            .find((it) => it.value === svalue)
          if (existingC === undefined) {
            const c: Channel & BitrixSyncDoc = {
              _id: generateId(),
              _class: contact.class.Channel,
              attachedTo: document._id,
              attachedToClass: attr.attributeOf,
              collection: attr.name,
              modifiedBy: document.modifiedBy,
              value: svalue,
              provider: f.provider,
              space: document.space,
              modifiedOn: document.modifiedOn,
              bitrixId: svalue
            }
            newExtraSyncDocs.push(c)
          }
        }
      }
    }
    return undefined
  }

  const getTagValue = async (attr: AnyAttribute, operation: CreateTagOperation): Promise<any> => {
    const defaultCategory = defaultCategories.find((it) => it.targetClass === attr.attributeOf)

    if (defaultCategory === undefined) {
      console.error('could not proceed tags without default category')
      return
    }
    for (const o of operation.fields) {
      const lval = extractValue(o.field)
      let vals: string[] = []
      if (lval == null) {
        continue
      }
      if (o.split !== '' && o.split != null) {
        vals = `${lval as string}`.split(o.split)
      } else {
        vals = [lval as string]
      }
      let ci = 0
      for (let vv of vals) {
        vv = vv.trim()
        if (vv === '') {
          continue
        }
        // Find existing element and create reference based on it.
        let tag: TagElement | undefined = allTagElements.find((it) => it.title === vv)
        if (tag === undefined) {
          tag = {
            _id: generateId(),
            _class: tags.class.TagElement,
            category: defaultCategory._id,
            color: 1,
            description: '',
            title: vv,
            targetClass: attr.attributeOf,
            space: tags.space.Tags,
            modifiedBy: document.modifiedBy,
            modifiedOn: document.modifiedOn
          }
          newExtraDocs.push(tag)
        }
        const ref: TagReference & BitrixSyncDoc = {
          _id: generateId(),
          attachedTo: existingId ?? document._id,
          attachedToClass: attr.attributeOf,
          collection: attr.name,
          _class: tags.class.TagReference,
          tag: tag._id,
          color: ci++,
          title: vv,
          weight: o.weight,
          modifiedBy: document.modifiedBy,
          modifiedOn: document.modifiedOn,
          space: tags.space.Tags,
          bitrixId: vv
        }
        newExtraSyncDocs.push(ref)
      }
    }
    return undefined
  }

  const getFindValue = async (
    attr: AnyAttribute,
    operation: FindReferenceOperation
  ): Promise<{ ref?: Ref<Doc>, bitrixId: string } | undefined> => {
    const lval = extractValue(operation.field)
    if (lval != null) {
      const bid = Array.isArray(lval) ? lval[0] : lval
      const doc = await client.findOne(operation.referenceClass, {
        [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: bid
      })
      if (doc !== undefined) {
        return { ref: doc._id, bitrixId: bid }
      } else {
        return { bitrixId: bid }
      }
    }
  }

  const getCreateAttachedValue = async (attr: AnyAttribute, operation: CreateHRApplication): Promise<void> => {
    const vacancyName = extractValue(operation.vacancyField)
    const sourceStatusName = extractValue(operation.stateField)

    postOperations.push(async (doc, extraDocs, ops, existingDoc) => {
      let vacancyId: Ref<Vacancy> | undefined
      if (ops.syncVacancy === false) {
        return
      }

      const vacancies = (extraDocs.get(recruit.class.Vacancy) ?? []) as Vacancy[]
      const applications = (extraDocs.get(recruit.class.Applicant) ?? []) as Applicant[]

      if (vacancyName !== undefined) {
        const tName = vacancyName.trim().toLowerCase()

        let refOrgField: Ref<Organization> | undefined
        const allAttrs = hierarchy.getAllAttributes(recruit.mixin.Candidate)
        for (const a of allAttrs.values()) {
          if (a.type._class === core.class.RefTo && (a.type as RefTo<Doc>).to === contact.class.Organization) {
            refOrgField = (mixins as any)[recruit.mixin.Candidate][a.name] as Ref<Organization>
          }
        }

        const vacancy = vacancies.find((it) => it.name.toLowerCase().trim() === tName && it.company === refOrgField)

        if (vacancy !== undefined) {
          vacancyId = vacancy?._id
        } else {
          vacancyId = await createVacancy(
            client,
            vacancyName.trim(),
            operation.defaultTemplate,
            document.modifiedBy,
            refOrgField
          )
          const vacancy = await client.findOne(recruit.class.Vacancy, { _id: vacancyId })
          if (vacancy != null) {
            // We need to put new vacancy so it will be reused.
            vacancies.push(vacancy)
          }
        }
      }

      if (sourceStatusName != null && sourceStatusName !== '') {
        // Check if candidate already have vacancy
        const existingApplicants = applications.filter(
          (it) => it.attachedTo === ((existingDoc?._id ?? doc.document._id) as unknown as Ref<Candidate>)
        )

        const candidate = doc.mixins[recruit.mixin.Candidate] as Data<Candidate>
        const ops = new TxOperations(client, document.modifiedBy)
        let statusName = sourceStatusName
        let mapping: BitrixStateMapping | undefined
        for (const t of operation.stateMapping ?? []) {
          if (t.sourceName === sourceStatusName) {
            statusName = t.targetName
            mapping = t
            break
          }
        }

        const attrs = getAllAttributes(client, recruit.mixin.Candidate)

        // Update candidate operations
        for (const u of mapping?.updateCandidate ?? []) {
          const attribute = attrs.get(u.attr)
          if (attribute === undefined) {
            console.error('failed to fill attribute', u.attr)
            continue
          }
          if (client.getHierarchy().isMixin(attribute.attributeOf)) {
            doc.mixins[attribute.attributeOf] = { ...(doc.mixins[attribute.attributeOf] ?? {}), [u.attr]: u.value }
          } else {
            ;(doc.document as any)[u.attr] = u.value
          }
        }
        if (vacancyId !== undefined) {
          let existing: Applicant | undefined
          for (const a of existingApplicants) {
            if (a.space === vacancyId) {
              existing = a
            } else {
              await ops.remove(a)
            }
          }

          // Find status for vacancy
          const update: DocumentUpdate<Applicant> = {}
          for (const k of operation.copyTalentFields ?? []) {
            const val = (candidate as any)[k.candidate]
            if ((existing as any)?.[k.applicant] !== val) {
              ;(update as any)[k.applicant] = val
            }
          }

          const states = await client.findAll(task.class.State, { space: vacancyId })
          const state = states.find((it) => it.name.toLowerCase().trim() === statusName.toLowerCase().trim())
          if (state !== undefined) {
            if (mapping?.doneState !== '') {
              const doneStates = await client.findAll(task.class.DoneState, { space: vacancyId })
              const doneState = doneStates.find(
                (it) => it.name.toLowerCase().trim() === mapping?.doneState.toLowerCase().trim()
              )
              if (doneState !== undefined) {
                if (doneState !== undefined && existing?.doneState !== doneState._id) {
                  update.doneState = doneState._id
                }
              }
            }

            if (existing !== undefined) {
              if (existing.status !== state?._id) {
                update.status = state._id
              }
              if (Object.keys(update).length > 0) {
                await ops.update(existing, update)
              }
            } else {
              await createApplication(ops, state, vacancyId, document, update as Data<Applicant>)
            }
          }
        }
      }
    })
  }

  const setValue = (value: any, attr: AnyAttribute): void => {
    if (value !== undefined) {
      if (hierarchy.isMixin(attr.attributeOf)) {
        mixins[attr.attributeOf] = {
          ...mixins[attr.attributeOf],
          [attr.name]: value
        }
      } else {
        ;(document as any)[attr.name] = value
      }
    }
  }

  for (const f of fields) {
    const attr = hierarchy.getAttribute(f.ofClass, f.attributeName)
    if (attr === undefined) {
      console.trace('Attribute not found', f)
      continue
    }
    let value: any
    switch (f.operation.kind) {
      case MappingOperation.CopyValue:
        value = await getCopyValue(attr, f.operation)
        break
      case MappingOperation.CreateChannel:
        value = await getChannelValue(attr, f.operation)
        break
      case MappingOperation.CreateTag:
        value = await getTagValue(attr, f.operation)
        break
      case MappingOperation.DownloadAttachment: {
        const blobRefs: { file: string, id: string }[] = await getDownloadValue(attr, f.operation)
        for (const blobRef of blobRefs) {
          const attachDoc: Attachment & BitrixSyncDoc = {
            _id: generateId(),
            bitrixId: `${blobRef.id}`,
            file: '', // Empty since not uploaded yet.
            name: blobRef.id,
            size: -1,
            type: 'application/octet-stream',
            lastModified: 0,
            attachedTo: existingId ?? document._id,
            attachedToClass: attr.attributeOf,
            collection: attr.name,
            _class: attachment.class.Attachment,
            modifiedBy: document.modifiedBy,
            modifiedOn: document.modifiedOn,
            space: document.space
          }

          blobs.push([
            attachDoc,
            async () => {
              if (blobRef !== undefined) {
                const response = await blobProvider?.(blobRef)
                if (response !== undefined) {
                  let fname = blobRef.id
                  switch (response.type) {
                    case 'application/pdf':
                      fname += '.pdf'
                      break
                    case 'application/msword':
                      fname += '.doc'
                      break
                  }
                  attachDoc.type = response.type
                  attachDoc.name = fname
                  return new File([response], fname, { type: response.type })
                }
              }
            },
            (file, attach) => {
              attach.attachedTo = document._id
              attach.size = file.size
              attach.type = file.type
            }
          ])
        }

        break
      }
      case MappingOperation.FindReference: {
        const ret = await getFindValue(attr, f.operation)
        if (ret?.ref !== undefined) {
          value = ret.ref
        } else if (ret !== undefined && f.operation.referenceType != null) {
          syncRequests.push({
            bitrixId: `${ret.bitrixId}`,
            type: f.operation.referenceType,
            update: (newRef: Ref<Doc>) => {
              setValue(newRef, attr)
            }
          })
        }
        break
      }
      case MappingOperation.CreateHRApplication: {
        await getCreateAttachedValue(attr, f.operation)
        break
      }
    }
    setValue(value, attr)
  }

  return {
    document,
    mixins,
    extraSync: newExtraSyncDocs,
    extraDocs: newExtraDocs,
    blobs,
    syncRequests,
    gmailDocuments: [],
    postOperations
  }
}

/**
 * @public
 */
export function toClassRef (val: any): Ref<Class<Doc>> {
  return val as Ref<Class<Doc>>
}

/**
 * @public
 */
export function getAllAttributes (client: Client, _class: Ref<Class<Doc>>): Map<string, AnyAttribute> {
  const h = client.getHierarchy()
  const _classAttrs = h.getAllAttributes(recruit.mixin.Candidate)

  const ancestors = h.getAncestors(_class)
  for (const a of ancestors) {
    for (const m of h.getDescendants(a).filter((it) => h.isMixin(it))) {
      for (const [k, v] of h.getOwnAttributes(m)) {
        _classAttrs.set(k, v)
      }
    }
  }
  return _classAttrs
}
