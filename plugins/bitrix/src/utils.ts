import { Comment } from '@hcengineering/chunter'
import contact, { Channel, EmployeeAccount } from '@hcengineering/contact'
import core, { AnyAttribute, Class, Client, Data, Doc, generateId, Mixin, Ref, Space } from '@hcengineering/core'
import tags, { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
import {
  BitrixEntityMapping,
  BitrixFieldMapping,
  BitrixSyncDoc,
  CopyValueOperation,
  CreateChannelOperation,
  CreateTagOperation,
  DownloadAttachmentOperation,
  MappingOperation
} from '.'
import bitrix from './index'

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
export interface ConvertResult {
  document: BitrixSyncDoc // Document we should achive
  mixins: Record<Ref<Mixin<Doc>>, Data<Doc>> // Mixins of document we will achive
  extraDocs: Doc[] // Extra documents we will achive, comments etc.
  blobs: File[] //
  comments?: Array<BitrixSyncDoc & Comment>
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
  prevExtra: Doc[], // <<-- a list of previous extra documents, so for example TagElement will be reused, if present for more what one item and required to be created
  tagElements: Map<Ref<Class<Doc>>, TagElement[]>, // TagElement cache.
  userList: Map<string, Ref<EmployeeAccount>>,
  existingDocuments: Doc[],
  defaultCategories: TagCategory[],
  blobProvider?: (blobRef: any) => Promise<Blob | undefined>
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

  const existingId = existingDocuments.find((it) => (it as any)[bitrix.mixin.BitrixSyncDoc].bitrixId === bitrixId)
    ?._id as Ref<BitrixSyncDoc>

  // Obtain a proper modified by for document

  const newExtraDocs: Doc[] = []
  const blobs: File[] = []
  const mixins: Record<Ref<Mixin<Doc>>, Data<Doc>> = {}

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
        if (Array.isArray(lval)) {
          return lval.map((it) => ({ id: it.id, file: it.downloadUrl }))
        }
      } else if (bfield.type === 'string' || bfield.type === 'url') {
        if (bfield.isMultiple && Array.isArray(lval)) {
          return lval.join(', ')
        }
        return lval
      } else if (bfield.type === 'date') {
        if (lval !== '' && lval != null) {
          return new Date(lval)
        }
      } else if (bfield.type === 'char') {
        return lval === 'Y'
      } else if (bfield.type === 'enumeration' || bfield.type === 'crm_status') {
        if (lval != null && lval !== '') {
          if (bfield.isMultiple && Array.isArray(lval)) {
            lval = lval[0] ?? ''
          }
          const eValue = bfield.items?.find((it) => it.ID === lval)?.VALUE
          if (eValue !== undefined) {
            return eValue
          }
        }
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
        r.push(lval)
      }
    }
    if (r.length === 1) {
      return r[0]
    }
    if (r.length === 0) {
      return
    }
    return r.join('').trim()
  }
  const getDownloadValue = async (attr: AnyAttribute, operation: DownloadAttachmentOperation): Promise<any> => {
    const r: Array<string | number | boolean | Date> = []
    for (const o of operation.fields) {
      const lval = extractValue(o.field)
      if (lval != null) {
        if (Array.isArray(lval)) {
          r.push(...lval)
        } else {
          r.push(lval)
        }
      }
    }
    if (r.length === 1) {
      return r[0]
    }
    if (r.length === 0) {
      return
    }
    return r.join('').trim()
  }

  const getChannelValue = async (attr: AnyAttribute, operation: CreateChannelOperation): Promise<any> => {
    for (const f of operation.fields) {
      const lval = extractValue(f.field)
      if (lval != null && lval !== '') {
        const vals = Array.isArray(lval) ? lval : [lval]
        for (const llVal of vals) {
          const c: Channel = {
            _id: generateId(),
            _class: contact.class.Channel,
            attachedTo: document._id,
            attachedToClass: attr.attributeOf,
            collection: attr.name,
            modifiedBy: document.modifiedBy,
            value: llVal,
            provider: f.provider,
            space: document.space,
            modifiedOn: document.modifiedOn
          }
          newExtraDocs.push(c)
        }
      }
    }
    return undefined
  }

  const getTagValue = async (attr: AnyAttribute, operation: CreateTagOperation): Promise<any> => {
    const elements =
      tagElements.get(attr.attributeOf) ??
      (await client.findAll<TagElement>(tags.class.TagElement, {
        targetClass: attr.attributeOf
      }))

    const references =
      existingId !== undefined
        ? await client.findAll<TagReference>(tags.class.TagReference, {
          attachedTo: existingId
        })
        : []
    // Add tags creation requests from previous conversions.
    elements.push(...prevExtra.filter((it) => it._class === tags.class.TagElement).map((it) => it as TagElement))

    tagElements.set(attr.attributeOf, elements)
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
      for (let vv of vals) {
        vv = vv.trim()
        if (vv === '') {
          continue
        }
        // Find existing element and create reference based on it.
        let tag: TagElement | undefined = elements.find((it) => it.title === vv)
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
        const ref: TagReference = {
          _id: generateId(),
          attachedTo: existingId ?? document._id,
          attachedToClass: attr.attributeOf,
          collection: attr.name,
          _class: tags.class.TagReference,
          tag: tag._id,
          color: 1,
          title: vv,
          weight: o.weight,
          modifiedBy: document.modifiedBy,
          modifiedOn: document.modifiedOn,
          space: tags.space.Tags
        }
        if (references.find((it) => it.title === vv) === undefined) {
          // Add only if not already added
          newExtraDocs.push(ref)
        }
      }
    }
    return undefined
  }

  for (const f of fields) {
    const attr = hierarchy.getAttribute(f.ofClass, f.attributeName)
    if (attr === undefined) {
      console.trace('Attribue not found', f)
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
        const blobRef: { file: string, id: string } = await getDownloadValue(attr, f.operation)
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
            blobs.push(new File([response], fname, { type: response.type }))
          }
        }
        break
      }
    }
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

  return { document, mixins, extraDocs: newExtraDocs, blobs }
}

/**
 * @public
 */
export function toClassRef (val: any): Ref<Class<Doc>> {
  return val as Ref<Class<Doc>>
}
