import type { TxViewlet } from '@anticrm/activity'
import core, { AttachedDoc, Class, Collection, Doc, Ref, TxCUD, TxOperations } from '@anticrm/core'
import { Asset, IntlString, translate } from '@anticrm/platform'
import { AnyComponent, AnySvelteComponent } from '@anticrm/ui'
import { AttributeModel } from '@anticrm/view'
import { buildModel, getObjectPresenter } from '@anticrm/view-resources'
import { ActivityKey, activityKey, DisplayTx } from '../activity'
import activity from '../plugin'

export type TxDisplayViewlet =
  | (Pick<TxViewlet, 'icon' | 'label' | 'display' | 'editable' | 'hideOnRemove' | 'labelComponent' | 'labelParams'> & {
    component?: AnyComponent | AnySvelteComponent
  })
  | undefined

async function createPseudoViewlet (
  client: TxOperations,
  dtx: DisplayTx,
  label: IntlString
): Promise<TxDisplayViewlet> {
  const doc = dtx.doc
  if (doc === undefined) {
    return
  }
  const docClass: Class<Doc> = client.getModel().getObject(doc._class)

  let trLabel = await translate(docClass.label, {})
  if (dtx.collectionAttribute !== undefined) {
    const itemLabel = (dtx.collectionAttribute.type as Collection<AttachedDoc>).itemLabel
    if (itemLabel !== undefined) {
      trLabel = await translate(itemLabel, {})
    }
  }

  // Check if it is attached doc and collection have title override.
  const presenter = await getObjectPresenter(client, doc._class, { key: 'doc-presenter' })
  if (presenter !== undefined) {
    return {
      display: 'inline',
      icon: docClass.icon ?? activity.icon.Activity,
      label: label,
      labelParams: { _class: trLabel, collection: dtx.collectionAttribute?.label !== undefined ? await translate(dtx.collectionAttribute?.label, {}) : '' },
      component: presenter.presenter
    }
  }
}

export function getDTxProps (dtx: DisplayTx): any {
  return { tx: dtx.tx, value: dtx.doc, dtx }
}

export async function updateViewlet (
  client: TxOperations,
  viewlets: Map<ActivityKey, TxViewlet>,
  dtx: DisplayTx
): Promise<{
    viewlet: TxDisplayViewlet
    id: Ref<TxCUD<Doc>>
    model: AttributeModel[]
    props: any
    modelIcon: Asset | undefined
  }> {
  const key = activityKey(dtx.tx.objectClass, dtx.tx._class)
  let viewlet: TxDisplayViewlet = viewlets.get(key)

  const props = getDTxProps(dtx)
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined

  if (viewlet === undefined) {
    ;({ viewlet, model } = await checkInlineViewlets(dtx, viewlet, client, model))
    if (model !== undefined) {
      // Check for State attribute
      for (const a of model) {
        if (a.icon !== undefined) {
          modelIcon = a.icon
          break
        }
      }
    }
  }
  return { viewlet, id: dtx.tx._id, model, props, modelIcon }
}

async function checkInlineViewlets (
  dtx: DisplayTx,
  viewlet: TxDisplayViewlet,
  client: TxOperations,
  model: AttributeModel[]
): Promise<{ viewlet: TxDisplayViewlet, model: AttributeModel[] }> {
  if (dtx.collectionAttribute !== undefined && dtx.txes.length > 0) {
    // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
    viewlet = await createPseudoViewlet(client, dtx, activity.string.CollectionUpdated)
  } else if (dtx.tx._class === core.class.TxCreateDoc) {
    // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
    viewlet = await createPseudoViewlet(client, dtx, activity.string.DocCreated)
  } else if (dtx.tx._class === core.class.TxRemoveDoc) {
    viewlet = await createPseudoViewlet(client, dtx, activity.string.DocDeleted)
  } else if (dtx.tx._class === core.class.TxUpdateDoc) {
    model = await createUpdateModel(dtx, client, model)
  }
  return { viewlet, model }
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
      keys: Object.keys(dtx.updateTx.operations).filter((id) => !id.startsWith('$')),
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

export async function getValue (client: TxOperations, m: AttributeModel, utx: any): Promise<any> {
  const val = utx[m.key]

  if (client.getHierarchy().isDerived(m._class, core.class.Doc) && typeof val === 'string') {
    // We have an reference, we need to find a real object to pass for presenter
    return await client.findOne(m._class, { _id: val as Ref<Doc> })
  }
  return val
}
