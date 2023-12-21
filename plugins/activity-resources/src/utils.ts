import { get } from 'svelte/store'
import type { DisplayTx, Reaction, TxViewlet } from '@hcengineering/activity'
import core, {
  type AttachedDoc,
  type Class,
  type Client,
  type Collection,
  type Doc,
  type Hierarchy,
  type Obj,
  type Ref,
  type TxCUD,
  type TxCollectionCUD,
  type TxCreateDoc,
  type TxMixin,
  type TxOperations,
  TxProcessor,
  type TxUpdateDoc,
  matchQuery,
  getCurrentAccount
} from '@hcengineering/core'
import { type Asset, type IntlString, getResource, translate } from '@hcengineering/platform'
import { getAttributePresenterClass } from '@hcengineering/presentation'
import { type AnyComponent, type AnySvelteComponent, ErrorPresenter, themeStore } from '@hcengineering/ui'
import view, { type AttributeModel, type BuildModelKey, type BuildModelOptions } from '@hcengineering/view'
import { getObjectPresenter } from '@hcengineering/view-resources'

import { type ActivityKey, activityKey } from './activity'
import activity from './plugin'

const valueTypes: ReadonlyArray<Ref<Class<Doc>>> = [
  core.class.TypeString,
  core.class.EnumOf,
  core.class.TypeNumber,
  core.class.TypeDate,
  core.class.TypeMarkup,
  core.class.TypeCollaborativeMarkup
]

export type TxDisplayViewlet =
  | (Pick<TxViewlet, 'icon' | 'label' | 'display' | 'editable' | 'hideOnRemove' | 'labelComponent' | 'labelParams'> & {
    component?: AnyComponent | AnySvelteComponent
    pseudo: boolean
  })
  | undefined

async function createPseudoViewlet (
  client: TxOperations,
  dtx: DisplayTx,
  label: IntlString,
  display: 'inline' | 'content' | 'emphasized' = 'inline'
): Promise<TxDisplayViewlet> {
  const docClass: Class<Doc> = client.getModel().getObject(dtx.tx.objectClass)

  const language = get(themeStore).language
  let trLabel = docClass.label !== undefined ? await translate(docClass.label, {}, language) : undefined
  if (dtx.collectionAttribute !== undefined) {
    const itemLabel = (dtx.collectionAttribute.type as Collection<AttachedDoc>).itemLabel
    if (itemLabel !== undefined) {
      trLabel = await translate(itemLabel, {}, language)
    }
  }

  // Check if it is attached doc and collection have title override.
  const presenter = await getObjectPresenter(client, dtx.tx.objectClass, { key: 'doc-presenter' }, false, false)
  if (presenter !== undefined) {
    let collection = ''
    if (dtx.collectionAttribute?.label !== undefined) {
      collection = await translate(dtx.collectionAttribute.label, {}, language)
    }
    return {
      display,
      icon: docClass.icon ?? activity.icon.Activity,
      label,
      labelParams: {
        _class: trLabel,
        collection
      },
      component: presenter.presenter,
      pseudo: true
    }
  }
}

export function getDTxProps (dtx: DisplayTx): any {
  return { tx: dtx.tx, value: dtx.doc, isOwnTx: dtx.isOwnTx, prevValue: dtx.prevDoc }
}

function getViewlet (
  viewlets: Map<ActivityKey, TxViewlet[]>,
  dtx: DisplayTx,
  hierarchy: Hierarchy
): TxDisplayViewlet | undefined {
  let key: string
  if (dtx.mixinTx?.mixin !== undefined && dtx.tx._id === dtx.mixinTx._id) {
    key = activityKey(dtx.mixinTx.mixin, dtx.tx._class)
  } else {
    key = activityKey(dtx.tx.objectClass, dtx.tx._class)
  }
  const vl = viewlets.get(key)
  if (vl !== undefined) {
    for (const viewlet of vl) {
      if (viewlet.match === undefined) {
        return { ...viewlet, pseudo: false }
      }
      const res = matchQuery([dtx.tx], viewlet.match, dtx.tx._class, hierarchy)
      if (res.length > 0) {
        return { ...viewlet, pseudo: false }
      }
    }
  }
}

export async function updateViewlet (
  client: TxOperations,
  viewlets: Map<ActivityKey, TxViewlet[]>,
  dtx: DisplayTx
): Promise<{
    viewlet: TxDisplayViewlet
    id: Ref<TxCUD<Doc>>
    model: AttributeModel[]
    props: any
    modelIcon: Asset | undefined
    iconComponent: AnyComponent | undefined
  }> {
  let viewlet = getViewlet(viewlets, dtx, client.getHierarchy())

  const props = getDTxProps(dtx)
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined
  let iconComponent: AnyComponent | undefined

  if (viewlet === undefined) {
    ;({ viewlet, model } = await checkInlineViewlets(dtx, viewlet, client, model, dtx.isOwnTx))
    if (model !== undefined) {
      // Check for State attribute
      for (const a of model) {
        if (a.icon !== undefined) {
          modelIcon = a.icon
          break
        }
      }
      for (const a of model) {
        if (a.attribute?.iconComponent !== undefined) {
          iconComponent = a.attribute?.iconComponent
          break
        }
      }
    }
  }
  return { viewlet, id: dtx.tx._id, model, props, modelIcon, iconComponent }
}

async function checkInlineViewlets (
  dtx: DisplayTx,
  viewlet: TxDisplayViewlet,
  client: TxOperations,
  model: AttributeModel[],
  isOwn: boolean
): Promise<{ viewlet: TxDisplayViewlet, model: AttributeModel[] }> {
  if (dtx.collectionAttribute !== undefined && (dtx.txDocIds?.size ?? 0) > 1) {
    // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
    viewlet = await createPseudoViewlet(client, dtx, activity.string.CollectionUpdated, 'inline')
  } else if (dtx.tx._class === core.class.TxCreateDoc) {
    // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
    viewlet = await createPseudoViewlet(client, dtx, isOwn ? activity.string.DocCreated : activity.string.DocAdded)
  } else if (dtx.tx._class === core.class.TxRemoveDoc) {
    viewlet = await createPseudoViewlet(client, dtx, activity.string.DocDeleted)
  } else if (dtx.tx._class === core.class.TxUpdateDoc || dtx.tx._class === core.class.TxMixin) {
    model = await createUpdateModel(dtx, client, model)
  }
  return { viewlet, model }
}

async function getAttributePresenter (
  client: Client,
  _class: Ref<Class<Obj>>,
  key: string,
  preserveKey: BuildModelKey
): Promise<AttributeModel> {
  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.getAttribute(_class, key)
  const presenterClass = getAttributePresenterClass(hierarchy, attribute)
  const isCollectionAttr = presenterClass.category === 'collection'
  const mixin = isCollectionAttr ? view.mixin.CollectionPresenter : view.mixin.ActivityAttributePresenter
  let presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, mixin)
  if (presenterMixin?.presenter === undefined && mixin === view.mixin.ActivityAttributePresenter) {
    presenterMixin = hierarchy.classHierarchyMixin(presenterClass.attrClass, view.mixin.AttributePresenter)
    if (presenterMixin?.presenter === undefined) {
      throw new Error('attribute presenter not found for ' + JSON.stringify(preserveKey))
    }
  } else if (presenterMixin?.presenter === undefined) {
    throw new Error('attribute presenter not found for ' + JSON.stringify(preserveKey))
  }
  const resultKey = preserveKey.sortingKey ?? preserveKey.key
  const sortingKey = Array.isArray(resultKey)
    ? resultKey
    : attribute.type._class === core.class.ArrOf
      ? resultKey + '.length'
      : resultKey
  const presenter = await getResource(presenterMixin.presenter)

  return {
    key: preserveKey.key,
    sortingKey,
    _class: presenterClass.attrClass,
    label: preserveKey.label ?? attribute.shortLabel ?? attribute.label,
    presenter,
    props: preserveKey.props,
    icon: presenterMixin.icon,
    attribute,
    collectionAttr: isCollectionAttr,
    isLookup: false
  }
}

async function buildModel (options: BuildModelOptions): Promise<AttributeModel[]> {
  // eslint-disable-next-line array-callback-return
  const model = options.keys
    .map((key) => (typeof key === 'string' ? { key } : key))
    .map(async (key) => {
      try {
        return await getAttributePresenter(options.client, options._class, key.key, key)
      } catch (err: any) {
        if (options.ignoreMissing ?? false) {
          return undefined
        }
        const stringKey = key.label ?? key.key
        console.error('Failed to find presenter for', key, err)
        const errorPresenter: AttributeModel = {
          key: '',
          sortingKey: '',
          presenter: ErrorPresenter,
          label: stringKey as IntlString,
          _class: core.class.TypeString,
          props: { error: err },
          collectionAttr: false,
          isLookup: false
        }
        return errorPresenter
      }
    })
  return (await Promise.all(model)).filter((a) => a !== undefined) as AttributeModel[]
}

async function createUpdateModel (
  dtx: DisplayTx,
  client: TxOperations,
  model: AttributeModel[]
): Promise<AttributeModel[]> {
  if (dtx.updateTx !== undefined) {
    const _class = dtx.updateTx.objectClass
    const ops = {
      client,
      _class,
      keys: Object.entries(dtx.updateTx.operations)
        .flatMap(([id, val]) => (['$push', '$pull'].includes(id) ? Object.keys(val) : id))
        .filter((id) => !id.startsWith('$')),
      ignoreMissing: true
    }
    const hiddenAttrs = getHiddenAttrs(client, _class)
    model = (await buildModel(ops)).filter((x) => !hiddenAttrs.has(x.key))
  } else if (dtx.mixinTx !== undefined) {
    const _class = dtx.mixinTx.mixin
    const ops = {
      client,
      _class,
      keys: Object.keys(dtx.mixinTx.attributes).filter((id) => !id.startsWith('$')),
      ignoreMissing: true
    }
    const hiddenAttrs = getHiddenAttrs(client, _class)
    model = (await buildModel(ops)).filter((x) => !hiddenAttrs.has(x.key))
  }
  return model
}

function getHiddenAttrs (client: TxOperations, _class: Ref<Class<Doc>>): Set<string> {
  return new Set(
    [...client.getHierarchy().getAllAttributes(_class).entries()]
      .filter(([, attr]) => attr.hidden === true)
      .map(([k]) => k)
  )
}

function getModifiedAttributes (tx: DisplayTx): any[] {
  if (tx.tx._class === core.class.TxUpdateDoc) {
    return ([tx.tx, ...tx.txes.map(({ tx }) => tx)] as unknown as Array<TxUpdateDoc<Doc>>).map(
      ({ operations }) => operations
    )
  }
  if (tx.tx._class === core.class.TxMixin) {
    return ([tx.tx, ...tx.txes.map(({ tx }) => tx)] as unknown as Array<TxMixin<Doc, Doc>>).map(
      ({ attributes }) => attributes
    )
  }
  return [{}]
}

async function buildRemovedDoc (
  client: TxOperations,
  objectId: Ref<Doc>,
  _class: Ref<Class<Doc>>
): Promise<Doc | undefined> {
  const isAttached = client.getHierarchy().isDerived(_class, core.class.AttachedDoc)
  const txes = await client.findAll<TxCUD<Doc>>(
    isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
    isAttached
      ? { 'tx.objectId': objectId as Ref<AttachedDoc> }
      : {
          objectId
        },
    { sort: { modifiedOn: 1 } }
  )
  const createTx = isAttached
    ? txes.find((tx) => (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxCreateDoc)
    : txes.find((tx) => tx._class === core.class.TxCreateDoc)
  if (createTx === undefined) return
  let doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>)
  for (let tx of txes) {
    tx = TxProcessor.extractTx(tx) as TxCUD<Doc>
    if (tx._class === core.class.TxUpdateDoc) {
      doc = TxProcessor.updateDoc2Doc(doc, tx as TxUpdateDoc<Doc>)
    } else if (tx._class === core.class.TxMixin) {
      const mixinTx = tx as TxMixin<Doc, Doc>
      doc = TxProcessor.updateMixin4Doc(doc, mixinTx)
    }
  }
  return doc
}

async function getAllRealValues (
  client: TxOperations,
  values: any[],
  _class: Ref<Class<Doc>>
): Promise<[any[], boolean]> {
  if (values.length === 0) return [[], false]
  if (values.some((value) => typeof value !== 'string')) {
    return [values, false]
  }

  if (valueTypes.includes(_class)) {
    return [values, false]
  }

  const realValues = await client.findAll(_class, { _id: { $in: values } })
  const realValuesIds = realValues.map(({ _id }) => _id)
  const res = [
    ...realValues,
    ...(await Promise.all(
      values
        .filter((value) => !realValuesIds.includes(value))
        .map(async (value) => await buildRemovedDoc(client, value, _class))
    ))
  ].filter((v) => v != null)
  return [res, true]
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

interface TxAttributeValue {
  set: any
  isObjectSet: boolean
  added: any[]
  isObjectAdded: boolean
  removed: any[]
  isObjectRemoved: boolean
}

export async function getValue (client: TxOperations, m: AttributeModel, tx: DisplayTx): Promise<TxAttributeValue> {
  const utxs = getModifiedAttributes(tx)
  const added = await getAllRealValues(client, combineAttributes(utxs, m.key, '$push', '$each'), m._class)
  const removed = await getAllRealValues(client, combineAttributes(utxs, m.key, '$pull', '$in'), m._class)
  const value: TxAttributeValue = {
    set: utxs[0][m.key],
    isObjectSet: false,
    added: added[0],
    isObjectAdded: added[1],
    removed: removed[0],
    isObjectRemoved: removed[1]
  }
  if (value.set !== undefined) {
    const res = await getAllRealValues(client, [value.set], m._class)
    value.set = res[0][0]
    value.isObjectSet = res[1]
  }
  return value
}

export async function updateDocReactions (
  client: TxOperations,
  reactions: Reaction[],
  object?: Doc,
  emoji?: string
): Promise<void> {
  if (emoji === undefined || object === undefined) {
    return
  }

  const currentAccount = getCurrentAccount()

  const reaction = reactions.find((r) => r.emoji === emoji && r.createBy === currentAccount._id)

  if (reaction == null) {
    await client.addCollection(activity.class.Reaction, object.space, object._id, object._class, 'reactions', {
      emoji,
      createBy: currentAccount._id
    })
  } else {
    await client.remove(reaction)
  }
}
