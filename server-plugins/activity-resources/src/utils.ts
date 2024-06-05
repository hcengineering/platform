import {
  Account,
  AttachedDoc,
  Class,
  CollaborativeDoc,
  collaborativeDocFromLastVersion,
  Doc,
  Hierarchy,
  Markup,
  MeasureContext,
  Mixin,
  Ref,
  RefTo,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceId
} from '@hcengineering/core'
import core from '@hcengineering/core/src/component'
import { ActivityMessageControl, DocAttributeUpdates, DocUpdateAction } from '@hcengineering/activity'
import { ActivityControl, DocObjectCache, getAllObjectTransactions } from '@hcengineering/server-activity'
import { getDocCollaborators } from '@hcengineering/server-notification-resources'
import notification from '@hcengineering/notification'
import { StorageAdapter, TriggerControl } from '@hcengineering/server-core'
import { loadCollaborativeDoc } from '@hcengineering/collaboration'
import { EmptyMarkup, yDocToMarkup } from '@hcengineering/text'

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

function combineAttributes (attributes: any[], key: string, operator: string, arrayKey: string): any[] {
  return Array.from(
    new Set(
      attributes.flatMap((attr) =>
        Array.isArray(attr[operator]?.[key]?.[arrayKey]) ? attr[operator]?.[key]?.[arrayKey] : attr[operator]?.[key]
      )
    )
  ).filter((v) => v != null)
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
  const isAttached = hierarchy.isDerived(_class, core.class.AttachedDoc)

  const objectTxes =
    objectCache?.transactions.get(objectId) ??
    (await getAllObjectTransactions(control, _class, [objectId], mixin)).get(objectId) ??
    []

  const createTx = isAttached
    ? objectTxes.find((tx) => (tx as TxCollectionCUD<Doc, AttachedDoc>).tx?._class === core.class.TxCreateDoc)
    : objectTxes.find((tx) => tx._class === core.class.TxCreateDoc)

  if (createTx === undefined) {
    return {}
  }

  let doc: Doc | undefined
  let prevDoc: Doc | undefined

  doc = TxProcessor.createDoc2Doc(TxProcessor.extractTx(createTx) as TxCreateDoc<Doc>)

  for (const objectTx of objectTxes) {
    const actualTx = TxProcessor.extractTx(objectTx) as TxCUD<Doc>

    if (actualTx._class === core.class.TxUpdateDoc) {
      prevDoc = hierarchy.clone(doc)
      doc = TxProcessor.updateDoc2Doc(doc, actualTx as TxUpdateDoc<Doc>)
    }

    if (actualTx._class === core.class.TxMixin) {
      prevDoc = hierarchy.clone(doc)
      doc = TxProcessor.updateMixin4Doc(doc, actualTx as TxMixin<Doc, Doc>)
    }

    if (objectTx._id === lastTxId) {
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

  let prevValue: Ref<Account>[] = []

  if (prevDoc !== undefined && hierarchy.hasMixin(prevDoc, notification.mixin.Collaborators)) {
    prevValue = hierarchy.as(prevDoc, notification.mixin.Collaborators).collaborators ?? []
  } else if (prevDoc !== undefined) {
    const mixin = hierarchy.classHierarchyMixin(prevDoc._class, notification.mixin.ClassCollaborators)
    prevValue = mixin !== undefined ? await getDocCollaborators(prevDoc, mixin, control as TriggerControl) : []
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
  originTx: TxCUD<Doc>,
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
      objectCache?.docs?.get(tx.objectId) ?? (await control.findAll(tx.objectClass, { _id: tx.objectId }))[0]
  }

  if (updateObject === undefined) {
    return []
  }

  const hierarchy = control.hierarchy

  const filterSet = new Set<string>()
  for (const c of controlRules ?? []) {
    for (const f of c.skipFields ?? []) {
      filterSet.add(f)
    }
  }

  const keys = getAvailableAttributesKeys(tx, hierarchy).filter((it) => !filterSet.has(it))

  if (keys.length === 0) {
    return []
  }

  const result: DocAttributeUpdates[] = []
  const modifiedAttributes = getModifiedAttributes(tx, hierarchy)
  const isMixin = hierarchy.isDerived(tx._class, core.class.TxMixin)
  const mixin = isMixin ? (tx as TxMixin<Doc, Doc>).mixin : undefined

  const { doc, prevDoc } = await getDocDiff(
    control,
    updateObject._class,
    updateObject._id,
    originTx._id,
    mixin,
    objectCache
  )

  for (const key of keys) {
    let attrValue = modifiedAttributes[key]
    let prevValue

    const added = combineAttributes([modifiedAttributes], key, '$push', '$each')
    const removed = combineAttributes([modifiedAttributes], key, '$pull', '$in')

    let attrClass: Ref<Class<Doc>> | undefined = mixin

    const clazz = hierarchy.findAttribute(updateObject._class, key)

    if (clazz !== undefined && 'to' in clazz.type) {
      attrClass = clazz.type.to as Ref<Class<Doc>>
    } else if (clazz !== undefined && 'of' in clazz?.type) {
      attrClass = (clazz.type.of as RefTo<Doc>).to
    }

    if (attrClass == null && clazz?.type?._class !== undefined) {
      attrClass = clazz.type._class
    }

    if (attrClass === undefined) {
      continue
    }

    if (Array.isArray(attrValue) && doc != null) {
      const diff = await getAttributeDiff(control, doc, prevDoc, key, attrClass, isMixin)
      added.push(...diff.added)
      removed.push(...diff.removed)
      attrValue = []
    }

    if (prevDoc !== undefined) {
      const rawPrevValue = isMixin ? (hierarchy.as(prevDoc, attrClass) as any)[key] : (prevDoc as any)[key]

      if (Array.isArray(rawPrevValue)) {
        prevValue = rawPrevValue
      } else if (rawPrevValue !== undefined && rawPrevValue !== null && typeof rawPrevValue === 'object') {
        prevValue = rawPrevValue._id
      } else {
        prevValue = rawPrevValue
      }
    }

    // we don't want to show collaborative documents in activity
    // instead we show their content as Markup
    // TODO this should be generalized via activity extension
    const attrType = mixin !== undefined ? hierarchy.findAttribute(mixin, key) : clazz
    if (attrType?.type?._class === core.class.TypeCollaborativeDoc) {
      attrClass = isMixin ? attrClass : core.class.TypeMarkup
      attrValue = await getMarkup(ctx, control.storageAdapter, control.workspace, attrValue, key)
      prevValue = await getMarkup(ctx, control.storageAdapter, control.workspace, prevValue, key)
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

async function getMarkup (
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspace: WorkspaceId,
  value: CollaborativeDoc,
  field: string
): Promise<Markup> {
  value = collaborativeDocFromLastVersion(value)
  const ydoc = await loadCollaborativeDoc(storage, workspace, value, ctx)
  return ydoc !== undefined ? yDocToMarkup(ydoc, field) : EmptyMarkup
}
