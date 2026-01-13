import core, {
  type AnyAttribute,
  type ArrOf,
  type AttachedData,
  type AttachedDoc,
  type Class,
  type Data,
  type Doc,
  type EnumOf,
  type Hierarchy,
  type ModelDb,
  type Ref,
  type RefTo,
  type TypeIdentifier
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import view from '@hcengineering/view'
import card from './plugin'

export async function importModule (json: string): Promise<void> {
  try {
    const data = JSON.parse(json) as Doc[]
    const client = getClient()
    const m = client.getModel()
    const h = client.getHierarchy()
    const apply = client.apply('Import')
    for (const elem of data) {
      if (m.findObject(elem._id) !== undefined) continue
      if (h.isDerived(elem._class, core.class.AttachedDoc)) {
        const attachedDoc = elem as AttachedDoc
        await apply.addCollection(
          attachedDoc._class,
          attachedDoc.space,
          attachedDoc.attachedTo,
          attachedDoc.attachedToClass,
          attachedDoc.collection,
          stripAttached(attachedDoc),
          attachedDoc._id
        )
      } else {
        await apply.createDoc(elem._class, elem.space, stripData(elem), elem._id)
      }
    }
    await apply.commit(true)
  } catch (e) {
    console.error('Failed to import process module:', e)
  }
}

function stripAttached (doc: AttachedDoc): AttachedData<AttachedDoc> {
  const { collection, attachedTo, attachedToClass, ...rest } = strip(doc)
  return rest
}

function stripData<T extends Doc> (doc: T): Data<T> {
  const { _id, _class, space, ...rest } = strip(doc)
  return rest as Data<T>
}

export async function exportModule (_id: Ref<Class<Doc>>): Promise<string> {
  const processed = new Set<Ref<Doc>>()
  const res = await exportType(_id, processed)
  const clear = res.map(strip)
  const str = JSON.stringify(clear)
  return str
}

function strip<T extends Doc> (doc: T): Omit<T, 'modifiedBy' | 'modifiedOn' | 'createdBy' | 'createdOn'> {
  const { modifiedBy, modifiedOn, createdBy, createdOn, ...rest } = doc
  return rest
}

async function exportAttribute (
  attr: AnyAttribute,
  m: ModelDb,
  h: Hierarchy
): Promise<{
    docs: Doc[]
    required: Array<Ref<Class<Doc>>>
  }> {
  const client = getClient()
  const docs: Doc[] = []
  const required: Array<Ref<Class<Doc>>> = []
  docs.push(attr)

  docs.push(...m.findAllSync(core.class.AttributePermission, { attribute: attr._id }))
  if (attr.type._class === core.class.TypeIdentifier) {
    const of = (attr.type as TypeIdentifier).of
    const seq = await client.findOne(core.class.Sequence, { _id: of })
    if (seq !== undefined) {
      seq.sequence = 0
      docs.push(seq)
    }
  }
  if (attr.type._class === core.class.EnumOf) {
    const of = (attr.type as EnumOf).of
    const val = m.findObject(of)
    if (val !== undefined) docs.push(val)
  }
  if (attr.type._class === core.class.RefTo) {
    const to = (attr.type as RefTo<Doc>).to
    if (h.isDerived(to, card.class.Card)) {
      required.push(to)
    }
  }
  if (attr.type._class === core.class.ArrOf) {
    const of = (attr.type as ArrOf<Doc>).of
    if (of._class === core.class.RefTo) {
      const to = (of as RefTo<Doc>).to
      if (h.isDerived(to, card.class.Card)) {
        required.push(to)
      }
    }
    if (of._class === core.class.EnumOf) {
      const val = m.findObject((of as EnumOf).of)
      if (val !== undefined) docs.push(val)
    }
  }
  return { docs, required }
}

async function exportType (
  _id: Ref<Class<Doc>>,
  processed: Set<Ref<Doc>>,
  withoutDesc: boolean = false
): Promise<Doc[]> {
  if (processed.has(_id)) return []
  const res: Doc[] = []
  const required: Array<Ref<Class<Doc>>> = []
  const client = getClient()
  const m = client.getModel()
  const h = client.getHierarchy()
  const type = m.findObject(_id)

  const parent = h.getClass(_id).extends
  if (parent !== undefined && h.isDerived(parent, card.class.Card) && parent !== card.class.Card) {
    if (!processed.has(parent)) {
      res.push(...(await exportType(parent, processed, withoutDesc)))
    }
  }

  processed.add(_id)
  if (type === undefined) return res
  if (type.icon === view.ids.IconWithEmoji && typeof type.color === 'string') {
    type.icon = card.icon.Card
  }

  res.push(...m.findAllSync(view.class.Viewlet, { attachTo: _id }))

  res.push(type)

  res.push(...m.findAllSync(core.class.ClassPermission, { targetClass: _id }))

  const attrs = h.getOwnAttributes(_id)
  for (const attr of attrs) {
    const at = await exportAttribute(attr[1], m, h)
    res.push(...at.docs)
    required.push(...at.required)
  }

  if (!withoutDesc || _id === card.class.Card) {
    const descendants = h.getDescendants(_id)
    for (const desc of descendants) {
      if (h.getClass(desc).extends !== _id) continue
      required.push(desc)
    }
  }

  res.push(...m.findAllSync(card.class.Role, { types: _id }))

  const assocA = m.findAllSync(core.class.Association, { classA: _id })
  for (const assoc of assocA) {
    res.push(assoc)
    required.push(assoc.classB)
  }

  const assocB = m.findAllSync(core.class.Association, { classB: _id })
  for (const assoc of assocB) {
    res.push(assoc)
    required.push(assoc.classA)
  }

  const extensions = m.findAllSync(card.class.ExportExtension, {})
  for (const ext of extensions) {
    const f = await getResource(ext.func)
    const extRes = f(_id)
    res.push(...extRes.docs)
    required.push(...extRes.required)
  }

  for (const req of required) {
    res.push(...(await exportType(req, processed)))
  }
  return res
}
