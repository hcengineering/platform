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

import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  AccountUuid,
  AnyAttribute,
  Data,
  Doc,
  fillDefaults,
  getDiffUpdate,
  Mixin,
  Ref,
  splitMixinUpdate,
  systemAccount,
  Tx,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import setting from '@hcengineering/setting'
import view from '@hcengineering/view'
import { RequestEventType } from '@hcengineering/communication-sdk-types'
import { getEmployee, getPersonSpaces } from '@hcengineering/server-contact'
import contact from '@hcengineering/contact'

async function OnAttribute (ctx: TxCreateDoc<AnyAttribute>[], control: TriggerControl): Promise<Tx[]> {
  const attr = TxProcessor.createDoc2Doc(ctx[0])
  if (control.hierarchy.isDerived(attr.attributeOf, card.class.Card)) {
    const desc = control.hierarchy.getDescendants(attr.attributeOf)
    const res: Tx[] = []
    for (const des of desc) {
      const viewlets = control.modelDb.findAllSync(view.class.Viewlet, { attachTo: des, variant: { $exists: false } })
      for (const viewlet of viewlets) {
        // let push it after grow for the list
        if (viewlet.descriptor === view.viewlet.List) {
          const index = viewlet.config.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
          if (index !== -1) {
            viewlet.config.splice(index + 1, 0, attr.name)
          } else {
            viewlet.config.push(attr.name)
          }
        } else {
          viewlet.config.push(attr.name)
        }
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: viewlet.config
          })
        )
        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          if (viewlet.descriptor === view.viewlet.List) {
            const index = viewlet.config.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
            if (index !== -1) {
              viewlet.config.splice(index + 1, 0, attr.name)
            } else {
              viewlet.config.push(attr.name)
            }
          } else {
            viewlet.config.push(attr.name)
          }
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

async function OnMasterTagRemove (ctx: TxUpdateDoc<MasterTag>[], control: TriggerControl): Promise<Tx[]> {
  const updateTx = ctx[0]
  if (updateTx.space === core.space.DerivedTx) return []
  if (updateTx.operations.removed !== true) return []
  const res: Tx[] = []
  const desc = control.hierarchy.getDescendants(updateTx.objectId)
  // should remove objects if masterTag
  const cards = await control.findAll<Card>(control.ctx, updateTx.objectId, {})
  for (const doc of cards) {
    res.push(control.txFactory.createTxRemoveDoc(card.class.Card, doc.space, doc._id))
  }
  for (const des of desc) {
    res.push(...(await removeTagRelations(control, des)))
  }
  for (const des of desc) {
    if (des === updateTx.objectId) continue
    const _class = control.hierarchy.findClass(des)
    if (_class === undefined) continue
    if (_class._class === card.class.MasterTag) {
      res.push(
        control.txFactory.createTxUpdateDoc<MasterTag>(card.class.MasterTag, core.space.Model, des, {
          removed: true
        })
      )
    } else {
      res.push(control.txFactory.createTxRemoveDoc(card.class.Tag, core.space.Model, des))
    }
  }

  return res
}

async function OnTagRemove (ctx: TxRemoveDoc<Tag>[], control: TriggerControl): Promise<Tx[]> {
  const removeTx = ctx[0]
  const removedTag = control.removedMap.get(removeTx.objectId)
  if (removedTag === undefined) return []
  const res: Tx[] = []
  const desc = control.hierarchy.getDescendants(removeTx.objectId)

  for (const des of desc) {
    if (des === removeTx.objectId) continue
    res.push(control.txFactory.createTxRemoveDoc(card.class.Tag, core.space.Model, des))
  }

  res.push(...(await removeTagRelations(control, removeTx.objectId)))

  return res
}

async function removeTagRelations (control: TriggerControl, tag: Ref<Tag | MasterTag>): Promise<Tx[]> {
  const res: Tx[] = []
  const viewlets = await control.findAll(control.ctx, view.class.Viewlet, {
    attachTo: tag
  })
  for (const viewlet of viewlets) {
    res.push(control.txFactory.createTxRemoveDoc(viewlet._class, viewlet.space, viewlet._id))
  }
  const attributes = control.modelDb.findAllSync(core.class.Attribute, {
    attributeOf: tag
  })
  for (const attribute of attributes) {
    res.push(control.txFactory.createTxRemoveDoc(attribute._class, attribute.space, attribute._id))
  }
  const removedRelation = new Set()
  const relationsA = control.modelDb.findAllSync(core.class.Association, {
    classA: tag
  })
  for (const rel of relationsA) {
    removedRelation.add(rel._id)
    res.push(control.txFactory.createTxRemoveDoc(core.class.Association, core.space.Model, rel._id))
  }
  const relationsB = control.modelDb.findAllSync(core.class.Association, {
    classB: tag
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
  if (tag._class === card.class.MasterTag) {
    const viewlets = await control.findAll(control.ctx, view.class.Viewlet, {
      attachTo: tag.extends,
      variant: { $exists: false }
    })
    for (const viewlet of viewlets) {
      const base = extractObjectProps(viewlet)
      res.push(
        control.txFactory.createTxCreateDoc(view.class.Viewlet, core.space.Model, {
          ...base,
          attachTo: createTx.objectId
        })
      )
    }
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

  const toDelete: string[] = []

  for (const key in removedCard.blobs ?? {}) {
    const val = removedCard.blobs[key]
    if (val === undefined) continue
    const toDelete: string[] = []
    toDelete.push(val.file)
  }

  if (toDelete.length > 0) {
    await control.storageAdapter.remove(control.ctx, control.workspace, toDelete)
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

async function OnCardUpdate (ctx: TxUpdateDoc<Card>[], control: TriggerControl): Promise<Tx[]> {
  const updateTx = ctx[0]
  const doc = (await control.findAll(control.ctx, card.class.Card, { _id: updateTx.objectId }))[0]
  if (doc === undefined) return []
  const res: Tx[] = []
  if (updateTx.operations.parent !== undefined) {
    const newParent = updateTx.operations.parent
    const oldParent = doc.parentInfo[doc.parentInfo.length - 1]?._id
    if (newParent != null) {
      const parent = (await control.findAll(control.ctx, card.class.Card, { _id: newParent }))[0]
      if (parent !== undefined) {
        if (parent.parentInfo.findIndex((p) => p._id === doc._id) === -1) {
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
        } else {
          // rollback
          return [
            control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
              parent: oldParent ?? null
            })
          ]
        }
      }
    }
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
  }
  if (updateTx.operations.title !== undefined) {
    res.push(...(await updateParentInfoName(control, doc._id, updateTx.operations.title, doc._id)))
  }

  return res
}

async function updateParentInfoName (
  control: TriggerControl,
  parent: Ref<Card>,
  title: string,
  originParent: Ref<Card>
): Promise<Tx[]> {
  const res: Tx[] = []
  const childs = await control.findAll(control.ctx, card.class.Card, { parent })
  for (const child of childs) {
    if (child._id === originParent) continue
    const parentInfo = child.parentInfo
    const index = parentInfo.findIndex((p) => p._id === parent)
    if (index === -1) {
      continue
    }
    parentInfo[index].title = title
    res.push(
      control.txFactory.createTxUpdateDoc(child._class, child.space, child._id, {
        parentInfo
      })
    )
    res.push(...(await updateParentInfoName(control, child._id, title, originParent)))
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

  await updateCollaborators(control, ctx)

  return res
}

async function updateCollaborators (control: TriggerControl, ctx: TxCreateDoc<Card>[]): Promise<void> {
  const { communicationApi } = control
  if (communicationApi == null) return

  for (const tx of ctx) {
    const modifier = await getEmployee(control, tx.modifiedBy)
    const collaborators: AccountUuid[] = []
    if (modifier?.personUuid != null && modifier.active) {
      collaborators.push(modifier.personUuid)
    }

    const personSpaces = await getPersonSpaces(control)
    const personSpace = personSpaces.find((it) => it._id === tx.objectSpace)

    if (personSpace != null && personSpace.person !== modifier?._id) {
      const spacePerson = (await control.findAll(control.ctx, contact.class.Person, { _id: personSpace.person }))[0]
      if (spacePerson?.personUuid != null) {
        collaborators.push(spacePerson.personUuid as AccountUuid)
      }
    }

    if (collaborators.length === 0) continue
    void communicationApi.event(
      { account: systemAccount },
      {
        type: RequestEventType.AddCollaborators,
        card: tx.objectId,
        collaborators
      }
    )
  }
}

export async function OnCardTag (ctx: TxMixin<Card, Card>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of ctx) {
    if (tx.space === core.space.DerivedTx) continue
    if (tx._class !== core.class.TxMixin) continue
    const target = tx.mixin
    const to = control.hierarchy.getBaseClass(target)
    const ancestors = control.hierarchy.getAncestors(target).filter((p) => control.hierarchy.isDerived(p, to))
    const mixinAncestors: Ref<Mixin<Doc>>[] = []
    const doc = (await control.findAll(control.ctx, tx.objectClass, { _id: tx.objectId }))[0]
    if (doc === undefined) continue
    for (const anc of ancestors) {
      if (anc === target) continue
      if (control.hierarchy.hasMixin(doc, anc)) break
      if (anc === to) break
      mixinAncestors.unshift(anc)
    }
    for (const anc of mixinAncestors) {
      res.push(control.txFactory.createTxMixin(doc._id, doc._class, doc.space, anc, {}))
    }
    const updated = fillDefaults(control.hierarchy, control.hierarchy.as(control.hierarchy.clone(doc), target), target)
    const diff = getDiffUpdate(doc, updated)
    const splitted = splitMixinUpdate(control.hierarchy, diff, target, doc._class)
    for (const it of splitted) {
      if (control.hierarchy.isMixin(it[0])) {
        res.push(control.txFactory.createTxMixin(doc._id, doc._class, doc.space, it[0], it[1]))
      } else {
        res.push(control.txFactory.createTxUpdateDoc(it[0], doc.space, doc._id, it[1]))
      }
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
    OnTagRemove,
    OnCardRemove,
    OnCardCreate,
    OnCardUpdate,
    OnCardTag
  }
})
