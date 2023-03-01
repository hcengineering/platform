import attachment, { Attachment } from '@hcengineering/attachment'
import contact, { Channel, EmployeeAccount } from '@hcengineering/contact'
import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  Client,
  Data,
  Doc,
  generateId,
  Mixin,
  Ref,
  Space,
  WithLookup
} from '@hcengineering/core'
import tags, { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
import bitrix, {
  BitrixEntityMapping,
  BitrixEntityType,
  BitrixFieldMapping,
  BitrixSyncDoc,
  CopyValueOperation,
  CreateChannelOperation,
  CreateTagOperation,
  DownloadAttachmentOperation,
  FindReferenceOperation,
  MappingOperation
} from '.'

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
export interface ConvertResult {
  document: BitrixSyncDoc // Document we should sync
  rawData: any
  mixins: Record<Ref<Mixin<Doc>>, Data<Doc>> // Mixins of document we will sync
  extraDocs: Doc[] // Extra documents we will sync, etc.
  extraSync: (AttachedDoc & BitrixSyncDoc)[] // Extra documents we will sync, etc.
  blobs: [Attachment & BitrixSyncDoc, () => Promise<File | undefined>, (file: File, attach: Attachment) => void][]
  syncRequests: BitrixSyncRequest[]
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
  userList: Map<string, Ref<EmployeeAccount>>,
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
        if (Array.isArray(lval)) {
          return lval.map((it) => it.VALUE)
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
          const svalue = typeof llVal === 'string' ? llVal : `${JSON.stringify(llVal)}`
          if (f.include != null || f.exclude != null) {
            if (f.include !== undefined && svalue.match(f.include) == null) {
              continue
            }
            if (f.exclude !== undefined && svalue.match(f.exclude) != null) {
              continue
            }
          }
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
    }
    setValue(value, attr)
  }

  return {
    document,
    mixins,
    extraSync: newExtraSyncDocs,
    extraDocs: newExtraDocs,
    blobs,
    rawData: rawDocument,
    syncRequests
  }
}

/**
 * @public
 */
export function toClassRef (val: any): Ref<Class<Doc>> {
  return val as Ref<Class<Doc>>
}
