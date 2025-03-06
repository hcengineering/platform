//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import card, { Card, DOMAIN_CARD, MasterTag, Tag } from '@hcengineering/card'
import core, {
  AnyAttribute,
  Class,
  Data,
  Doc,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import view from '@hcengineering/view'
import setting from '@hcengineering/setting'

async function OnAttribute (ctx: TxCreateDoc<AnyAttribute>[], control: TriggerControl): Promise<Tx[]> {
  const attr = TxProcessor.createDoc2Doc(ctx[0])
  if (control.hierarchy.isDerived(attr.attributeOf, card.class.Card)) {
    const desc = control.hierarchy.getDescendants(attr.attributeOf)
    const res: Tx[] = []
    for (const des of desc) {
      const viewlets = control.modelDb.findAllSync(view.class.Viewlet, { attachTo: des })
      for (const viewlet of viewlets) {
        viewlet.config.push(attr.name)
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: viewlet.config
          })
        )
        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          pref.config.push(attr.name)
          res.push(
            control.txFactory.createTxUpdateDoc(pref._class, pref.space, pref._id, {
              config: pref.config
            })
          )
        }
      }
    }
    return res
  }
  return []
}

async function OnAttributeRemove (ctx: TxRemoveDoc<AnyAttribute>[], control: TriggerControl): Promise<Tx[]> {
  const attr = control.removedMap.get(ctx[0].objectId) as AnyAttribute
  if (attr === undefined) return []
  if (control.hierarchy.isDerived(attr.attributeOf, card.class.Card)) {
    const desc = control.hierarchy.getDescendants(attr.attributeOf)
    const res: Tx[] = []
    for (const des of desc) {
      const viewlets = control.modelDb.findAllSync(view.class.Viewlet, { attachTo: des })
      for (const viewlet of viewlets) {
        viewlet.config = viewlet.config.filter((p) => p !== attr.name)
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: viewlet.config
          })
        )
        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          pref.config = pref.config.filter((p) => p !== attr.name)
          res.push(
            control.txFactory.createTxUpdateDoc(pref._class, pref.space, pref._id, {
              config: pref.config
            })
          )
        }
      }
    }
    return res
  }
  return []
}

async function OnMasterTagRemove (ctx: TxRemoveDoc<MasterTag | Tag>[], control: TriggerControl): Promise<Tx[]> {
  const removeTx = ctx[0]
  const removedTag = control.removedMap.get(removeTx.objectId)
  if (removedTag === undefined) return []
  const res: Tx[] = []
  // should remove objects if masterTag
  if (removedTag._class === card.class.MasterTag) {
    const cards = await control.lowLevel.rawFindAll(DOMAIN_CARD, { _class: removedTag._id as Ref<Class<Doc>> })
    for (const card of cards) {
      res.push(control.txFactory.createTxRemoveDoc(card._class, card.space, card._id))
    }
  }
  const viewlets = await control.findAll(control.ctx, view.class.Viewlet, {
    attachTo: removeTx.objectId
  })
  for (const viewlet of viewlets) {
    res.push(control.txFactory.createTxRemoveDoc(viewlet._class, viewlet.space, viewlet._id))
  }
  const attributes = control.modelDb.findAllSync(core.class.Attribute, {
    attributeOf: removeTx.objectId
  })
  for (const attribute of attributes) {
    res.push(control.txFactory.createTxRemoveDoc(attribute._class, attribute.space, attribute._id))
  }
  const desc = control.hierarchy.getDescendants(removeTx.objectId)
  for (const des of desc) {
    if (des === removeTx.objectId) continue
    res.push(control.txFactory.createTxRemoveDoc(card.class.MasterTag, core.space.Model, des))
  }
  const removedRelation = new Set()
  const relationsA = control.modelDb.findAllSync(core.class.Association, {
    classA: removeTx.objectId
  })
  for (const rel of relationsA) {
    removedRelation.add(rel._id)
    res.push(control.txFactory.createTxRemoveDoc(core.class.Association, core.space.Model, rel._id))
  }
  const relationsB = control.modelDb.findAllSync(core.class.Association, {
    classB: removeTx.objectId
  })
  for (const rel of relationsB) {
    if (removedRelation.has(rel._id)) continue
    res.push(control.txFactory.createTxRemoveDoc(core.class.Association, core.space.Model, rel._id))
  }

  return res
}

function extractObjectProps<T extends Doc> (doc: T): Data<T> {
  const data: any = {}
  for (const key in doc) {
    if (key === '_id') {
      continue
    }
    data[key] = doc[key]
  }
  return data as Data<T>
}

async function OnMasterTagCreate (ctx: TxCreateDoc<MasterTag | Tag>[], control: TriggerControl): Promise<Tx[]> {
  const createTx = ctx[0]
  const tag = TxProcessor.createDoc2Doc(createTx)
  const res: Tx[] = []
  res.push(
    control.txFactory.createTxMixin(createTx.objectId, core.class.Mixin, core.space.Model, setting.mixin.Editable, {
      value: true
    })
  )
  res.push(
    control.txFactory.createTxMixin(createTx.objectId, core.class.Mixin, core.space.Model, setting.mixin.UserMixin, {})
  )
  const viewlets = await control.findAll(control.ctx, view.class.Viewlet, { attachTo: tag.extends })
  for (const viewlet of viewlets) {
    const base = extractObjectProps(viewlet)
    res.push(
      control.txFactory.createTxCreateDoc(view.class.Viewlet, core.space.Model, {
        ...base,
        attachTo: createTx.objectId
      })
    )
  }

  return res
}

async function OnCardRemove (ctx: TxRemoveDoc<Card>[], control: TriggerControl): Promise<Tx[]> {
  const removeTx = ctx[0]
  const removedCard = control.removedMap.get(removeTx.objectId) as Card
  if (removedCard === undefined) return []
  const res: Tx[] = []
  const cards = await control.findAll(control.ctx, card.class.Card, { parent: removedCard._id })
  for (const card of cards) {
    res.push(control.txFactory.createTxRemoveDoc(card._class, card.space, card._id))
  }
  if (removedCard.parent != null) {
    res.push(
      control.txFactory.createTxUpdateDoc(card.class.Card, core.space.Workspace, removedCard.parent, {
        $inc: {
          children: -1
        }
      })
    )
  }

  return res
}

async function OnCardParentChange (ctx: TxUpdateDoc<Card>[], control: TriggerControl): Promise<Tx[]> {
  const updateTx = ctx[0]
  if (updateTx.operations.parent === undefined) return []
  const newParent = updateTx.operations.parent
  const doc = (await control.findAll(control.ctx, card.class.Card, { _id: updateTx.objectId }))[0]
  if (doc === undefined) return []
  const oldParent = doc.parentInfo[doc.parentInfo.length - 1]?._id
  const res: Tx[] = []
  if (oldParent != null) {
    const parent = (await control.findAll(control.ctx, card.class.Card, { _id: oldParent }))[0]
    if (parent !== undefined) {
      res.push(
        control.txFactory.createTxUpdateDoc(parent._class, parent.space, parent._id, {
          $inc: {
            children: -1
          }
        })
      )
    }
  }
  if (newParent != null) {
    const parent = (await control.findAll(control.ctx, card.class.Card, { _id: newParent }))[0]
    if (parent !== undefined) {
      res.push(
        control.txFactory.createTxUpdateDoc(parent._class, parent.space, parent._id, {
          $inc: {
            children: 1
          }
        })
      )
      res.push(
        control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
          parentInfo: [
            ...parent.parentInfo,
            {
              _id: parent._id,
              _class: parent._class,
              title: parent.title
            }
          ]
        })
      )
    }
  }

  return res
}

async function OnCardCreate (ctx: TxCreateDoc<Card>[], control: TriggerControl): Promise<Tx[]> {
  const createTx = ctx[0]
  const doc = TxProcessor.createDoc2Doc(createTx)
  const res: Tx[] = []
  if (doc.parent != null) {
    const parent = (await control.findAll(control.ctx, card.class.Card, { _id: doc.parent }))[0]
    if (parent !== undefined) {
      res.push(
        control.txFactory.createTxUpdateDoc(parent._class, parent.space, parent._id, {
          $inc: {
            children: 1
          }
        })
      )
    }
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttribute,
    OnAttributeRemove,
    OnMasterTagCreate,
    OnMasterTagRemove,
    OnCardRemove,
    OnCardCreate,
    OnCardParentChange
  }
})
