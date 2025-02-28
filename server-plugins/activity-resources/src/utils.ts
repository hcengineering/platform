import { type ActivityMessageControl, type DocAttributeUpdates, type DocUpdateAction } from '@hcengineering/activity'
import {
  type PersonId,
  type AttachedDoc,
  type Attribute,
  type Class,
  type Collection,
  type Doc,
  type Hierarchy,
  type MeasureContext,
  type Mixin,
  type Ref,
  type RefTo,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  TxProcessor,
  type TxUpdateDoc,
  combineAttributes,
  type ArrOf
} from '@hcengineering/core'
import core from '@hcengineering/core/src/component'
import notification from '@hcengineering/notification'
import { translate } from '@hcengineering/platform'
import { type ActivityControl, type DocObjectCache, getAllObjectTransactions } from '@hcengineering/server-activity'
import { type TriggerControl } from '@hcengineering/server-core'
import { getDocCollaborators } from '@hcengineering/server-notification-resources'

function getAvailableAttributesKeys (tx: TxCUD<Doc>, hierarchy: Hierarchy): string[] {
  if (hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) {
    const updateTx = tx as TxUpdateDoc<Doc>
    const _class = updateTx.objectClass

    try {
      hierarchy.getClass(_class)
    } catch (err: any) {
      // class is deleted
      return []
    }

    const hiddenAttrs = getHiddenAttrs(hierarchy, _class)

    return Object.entries(updateTx.operations)
      .flatMap(([id, val]) => (['$push', '$pull'].includes(id) ? Object.keys(val) : id))
      .filter((id) => !id.startsWith('$') && !hiddenAttrs.has(id))
  }

  if (hierarchy.isDerived(tx._class, core.class.TxMixin)) {
    const mixinTx = tx as TxMixin<Doc, Doc>
    const _class = mixinTx.mixin

    try {
      hierarchy.getClass(_class)
    } catch (err: any) {
      // mixin is deleted
      return []
    }

    const hiddenAttrs = getHiddenAttrs(hierarchy, _class)
    return Object.keys(mixinTx.attributes)
      .filter((id) => !id.startsWith('$'))
      .filter((key) => !hiddenAttrs.has(key))
  }

  return []
}

function getModifiedAttributes (tx: TxCUD<Doc>, hierarchy: Hierarchy): Record<string, any> {
  if (hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) {
    const updateTx = tx as TxUpdateDoc<Doc>

    return updateTx.operations as Record<string, any>
  }
  if (hierarchy.isDerived(tx._class, core.class.TxMixin)) {
    const mixinTx = tx as TxMixin<Doc, Doc>
    return mixinTx.attributes as Record<string, any>
  }
  return {}
}

export function getDocUpdateAction (control: ActivityControl, tx: TxCUD<Doc>): DocUpdateAction {
  const hierarchy = control.hierarchy

  if (hierarchy.isDerived(tx._class, core.class.TxCreateDoc)) {
    return 'create'
  }

  if (hierarchy.isDerived(tx._class, core.class.TxRemoveDoc)) {
    return 'remove'
  }

  return 'update'
}

export async function getDocDiff (
  control: ActivityControl,
  _class: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  lastTxId: Ref<TxCUD<Doc>>,
  mixin?: Ref<Mixin<Doc>>,
  objectCache?: DocObjectCache
): Promise<{ doc?: Doc, prevDoc?: Doc }> {
  const hierarchy = control.hierarchy

  const objectTxes =
    objectCache?.transactions.get(objectId) ??
    (await getAllObjectTransactions(control, _class, [objectId], mixin)).get(objectId) ??
    []

  const createTx = objectTxes.find((tx) => tx._class === core.class.TxCreateDoc)

  if (createTx === undefined) {
    return {}
  }

  let doc: Doc | undefined
  let prevDoc: Doc | undefined

  doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>)

  for (const actualTx of objectTxes) {
    if (actualTx._class === core.class.TxUpdateDoc) {
      prevDoc = hierarchy.clone(doc)
      doc = TxProcessor.updateDoc2Doc(doc, actualTx as TxUpdateDoc<Doc>)
    }

    if (actualTx._class === core.class.TxMixin) {
      prevDoc = hierarchy.clone(doc)
      doc = TxProcessor.updateMixin4Doc(doc, actualTx as TxMixin<Doc, Doc>)
    }

    if (actualTx._id === lastTxId) {
      break
    }
  }

  return { doc, prevDoc }
}

interface AttributeDiff {
  added: DocAttributeUpdates['added']
  removed: DocAttributeUpdates['removed']
}

async function getCollaboratorsDiff (
  control: ActivityControl,
  doc: Doc,
  prevDoc: Doc | undefined
): Promise<AttributeDiff> {
  const { hierarchy } = control
  const value = hierarchy.as(doc, notification.mixin.Collaborators).collaborators ?? []

  let prevValue: PersonId[] = []

  if (prevDoc !== undefined && hierarchy.hasMixin(prevDoc, notification.mixin.Collaborators)) {
    prevValue = hierarchy.as(prevDoc, notification.mixin.Collaborators).collaborators ?? []
  } else if (prevDoc !== undefined) {
    const mixin = hierarchy.classHierarchyMixin(prevDoc._class, notification.mixin.ClassCollaborators)
    prevValue =
      mixin !== undefined
        ? await getDocCollaborators((control as TriggerControl).ctx, prevDoc, mixin, control as TriggerControl)
        : []
  }

  const added = value.filter((item) => !prevValue.includes(item)) as DocAttributeUpdates['added']
  const removed = prevValue.filter((item) => !value.includes(item)) as DocAttributeUpdates['removed']

  return {
    added,
    removed
  }
}

export async function getAttributeDiff (
  control: ActivityControl,
  doc: Doc,
  prevDoc: Doc | undefined,
  attrKey: string,
  attrClass: Ref<Class<Doc>>,
  isMixin: boolean
): Promise<AttributeDiff> {
  const { hierarchy } = control

  let actualDoc: Doc | undefined = doc
  let actualPrevDoc: Doc | undefined = prevDoc

  if (isMixin && hierarchy.isDerived(attrClass, notification.mixin.Collaborators)) {
    return await getCollaboratorsDiff(control, doc, prevDoc)
  }

  if (isMixin) {
    actualDoc = hierarchy.as(doc, attrClass)
    actualPrevDoc = prevDoc === undefined ? undefined : hierarchy.as(prevDoc, attrClass)
  }

  const value = (actualDoc as any)[attrKey] ?? []
  const prevValue = (actualPrevDoc as any)?.[attrKey] ?? []

  if (!Array.isArray(value) || !Array.isArray(prevValue)) {
    return {
      added: [],
      removed: []
    }
  }

  const added = value.filter((item) => !prevValue.includes(item)) as DocAttributeUpdates['added']
  const removed = prevValue.filter((item) => !value.includes(item)) as DocAttributeUpdates['removed']

  return {
    added,
    removed
  }
}

export async function getTxAttributesUpdates (
  ctx: MeasureContext,
  control: ActivityControl,
  tx: TxCUD<Doc>,
  object: Doc,
  objectCache?: DocObjectCache,
  controlRules?: ActivityMessageControl[]
): Promise<DocAttributeUpdates[]> {
  if (![core.class.TxMixin, core.class.TxUpdateDoc].includes(tx._class)) {
    return []
  }

  let updateObject = object

  if (updateObject._id !== tx.objectId) {
    updateObject =
      objectCache?.docs?.get(tx.objectId) ?? (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }))[0]
  }

  if (updateObject === undefined) {
    return []
  }

  const hierarchy = control.hierarchy

  const allowedFields = new Set<string>(controlRules?.flatMap((it) => it.allowedFields ?? []) ?? [])
  const skipFields = new Set<string>(controlRules?.flatMap((it) => it.skipFields ?? []) ?? [])

  const keys = getAvailableAttributesKeys(tx, hierarchy).filter(
    (it) => !skipFields.has(it) && (allowedFields.size === 0 || allowedFields.has(it))
  )

  if (keys.length === 0) {
    return []
  }

  const result: DocAttributeUpdates[] = []
  const modifiedAttributes = getModifiedAttributes(tx, hierarchy)
  const isMixin = hierarchy.isDerived(tx._class, core.class.TxMixin)
  const mixin = isMixin ? (tx as TxMixin<Doc, Doc>).mixin : undefined

  let docDiff: { doc?: Doc, prevDoc?: Doc } | undefined

  for (const key of keys) {
    let attrValue = modifiedAttributes[key]
    let prevValue

    const added = combineAttributes([modifiedAttributes], key, '$push', '$each')
    const removed = combineAttributes([modifiedAttributes], key, '$pull', '$in')

    let attrClass: Ref<Class<Doc>> | undefined = mixin

    const clazz = hierarchy.findAttribute(updateObject._class, key)

    if (clazz !== undefined && 'to' in clazz.type) {
      attrClass = clazz.type.to as Ref<Class<Doc>>
    } else if (clazz !== undefined && hierarchy.isDerived(clazz.type._class, core.class.ArrOf)) {
      attrClass = (clazz.type as ArrOf<Doc>).of._class
    } else if (clazz !== undefined && 'of' in clazz?.type) {
      attrClass = (clazz.type.of as RefTo<Doc>).to
    }

    if (attrClass == null && clazz?.type?._class !== undefined) {
      attrClass = clazz.type._class
    }

    if (attrClass === undefined) {
      continue
    }

    if (attrClass === core.class.TypeCollaborativeDoc) {
      // collaborative documents activity is handled by collaborator
      continue
    }

    if (hierarchy.isDerived(attrClass, core.class.TypeMarkup) || mixin === notification.mixin.Collaborators) {
      if (docDiff === undefined) {
        docDiff = await getDocDiff(control, updateObject._class, updateObject._id, tx._id, mixin, objectCache)
      }
    }

    if (Array.isArray(attrValue) && docDiff?.doc !== undefined) {
      const diff = await getAttributeDiff(control, docDiff.doc, docDiff.prevDoc, key, attrClass, isMixin)
      added.push(...diff.added)
      removed.push(...diff.removed)
      attrValue = []
    }

    if (docDiff?.prevDoc !== undefined) {
      const { prevDoc } = docDiff
      const rawPrevValue = isMixin ? (hierarchy.as(prevDoc, attrClass) as any)[key] : (prevDoc as any)[key]

      if (Array.isArray(rawPrevValue)) {
        prevValue = rawPrevValue
      } else if (rawPrevValue !== undefined && rawPrevValue !== null && typeof rawPrevValue === 'object') {
        prevValue = rawPrevValue._id
      } else {
        prevValue = rawPrevValue
      }
    }

    let setAttr = []

    if (Array.isArray(attrValue)) {
      setAttr = attrValue
    } else if (key in modifiedAttributes) {
      setAttr = [attrValue]
    }

    result.push({
      attrKey: key,
      attrClass,
      set: setAttr,
      added,
      removed,
      prevValue,
      isMixin
    })
  }

  return result
}

function getHiddenAttrs (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): Set<string> {
  return new Set(
    [...hierarchy.getAllAttributes(_class).entries()].filter(([, attr]) => attr.hidden === true).map(([k]) => k)
  )
}

export async function getAttrName (
  attributeUpdates: DocAttributeUpdates,
  objectClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy
): Promise<string | undefined> {
  const { attrKey, attrClass, isMixin } = attributeUpdates
  let attrObjectClass = objectClass

  try {
    if (isMixin) {
      const keyedAttribute = [...hierarchy.getAllAttributes(attrClass).entries()]
        .filter(([, value]) => value.hidden !== true)
        .map(([key, attr]) => ({ key, attr }))
        .find(({ key }) => key === attrKey)
      if (keyedAttribute === undefined) {
        return undefined
      }
      attrObjectClass = keyedAttribute.attr.attributeOf
    }

    const attribute = hierarchy.getAttribute(attrObjectClass, attrKey)

    const label = attribute.shortLabel ?? attribute.label

    if (label === undefined) {
      return undefined
    }

    return await translate(label, {})
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export function getCollectionAttribute (
  hierarchy: Hierarchy,
  objectClass: Ref<Class<Doc>>,
  collection?: string
): Attribute<Collection<AttachedDoc>> | undefined {
  if (collection === undefined) {
    return undefined
  }

  const descendants = hierarchy.getDescendants(objectClass)

  for (const descendant of descendants) {
    const collectionAttribute = hierarchy.findAttribute(descendant, collection)
    if (collectionAttribute !== undefined) {
      return collectionAttribute
    }
  }

  return undefined
}
