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
  generateId,
  getDiffUpdate,
  Mixin,
  notEmpty,
  OperationDomain,
  Ref,
  Space,
  splitMixinUpdate,
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
import {
  AddCollaboratorsEvent,
  CardEventType,
  NotificationEventType,
  PeerEventType,
  RemoveCardEvent,
  UpdateCardTypeEvent,
  CreatePeerEvent,
  ThreadPatchEvent,
  MessageEventType
} from '@hcengineering/communication-sdk-types'
import { getEmployee, getPersonSpaces } from '@hcengineering/server-contact'
import contact, { Employee, formatName, Person } from '@hcengineering/contact'
import communication, { Direct } from '@hcengineering/communication'
import { CardPeer } from '@hcengineering/communication-types'

async function OnAttribute (ctx: TxCreateDoc<AnyAttribute>[], control: TriggerControl): Promise<Tx[]> {
  const attr = TxProcessor.createDoc2Doc(ctx[0])
  if (control.hierarchy.isDerived(attr.attributeOf, card.class.Card)) {
    const desc = control.hierarchy.getDescendants(attr.attributeOf)
    const res: Tx[] = []
    for (const des of desc) {
      const viewlets = control.modelDb.findAllSync(view.class.Viewlet, { attachTo: des, variant: { $exists: false } })
      for (const viewlet of viewlets) {
        const updatedConfig = [...viewlet.config]
        // let push it after grow for the list
        if (viewlet.descriptor === view.viewlet.List) {
          const index = viewlet.config.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
          if (index !== -1) {
            updatedConfig.splice(index + 1, 0, attr.name)
          } else {
            updatedConfig.push(attr.name)
          }
        } else {
          updatedConfig.push(attr.name)
        }
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: updatedConfig
          })
        )

        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          const updatedPrefConfig = [...pref.config]
          if (viewlet.descriptor === view.viewlet.List) {
            const index = updatedPrefConfig.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
            if (index !== -1) {
              updatedPrefConfig.splice(index + 1, 0, attr.name)
            } else {
              updatedPrefConfig.push(attr.name)
            }
          } else {
            updatedPrefConfig.push(attr.name)
          }
          res.push(
            control.txFactory.createTxUpdateDoc(pref._class, pref.space, pref._id, {
              config: updatedPrefConfig
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
        res.push(
          control.txFactory.createTxUpdateDoc(viewlet._class, viewlet.space, viewlet._id, {
            config: viewlet.config.filter((p) => p !== attr.name)
          })
        )
        const prefs = await control.findAll(control.ctx, view.class.ViewletPreference, { attachedTo: viewlet._id })
        for (const pref of prefs) {
          res.push(
            control.txFactory.createTxUpdateDoc(pref._class, pref.space, pref._id, {
              config: pref.config.filter((p) => p !== attr.name)
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

function extractObjectData<T extends Doc> (doc: T): Data<T> {
  const dataKeys = ['_id', 'space', 'modifiedOn', 'modifiedBy', 'createdBy', 'createdOn']
  const data: any = {}
  for (const key in doc) {
    if (dataKeys.includes(key)) {
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
      const base = extractObjectData(viewlet)
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
  const favorites = await control.findAll(control.ctx, card.class.FavoriteCard, { attachedTo: removedCard._id })
  for (const favorite of favorites) {
    res.push(control.txFactory.createTxRemoveDoc(favorite._class, favorite.space, favorite._id))
  }

  const event: RemoveCardEvent = {
    type: CardEventType.RemoveCard,
    cardId: removedCard._id,
    date: new Date(removeTx.createdOn ?? removeTx.modifiedOn),
    socialId: removedCard.modifiedBy
  }

  await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
    event
  })

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
  if ((updateTx.operations as any)._class !== undefined) {
    const event: UpdateCardTypeEvent = {
      type: CardEventType.UpdateCardType,
      cardId: doc._id,
      cardType: (updateTx.operations as any)._class,
      socialId: updateTx.createdBy ?? updateTx.modifiedBy,
      date: new Date(updateTx.createdOn ?? updateTx.modifiedOn)
    }
    await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
      event
    })
  }

  res.push(...(await updatePeers(control, doc, updateTx)))
  return res
}

async function updatePeers (control: TriggerControl, doc: Card, updateTx: TxUpdateDoc<Card>): Promise<Tx[]> {
  if (updateTx.space === core.space.DerivedTx) return []
  const isDirect = control.hierarchy.isDerived(doc._class, communication.type.Direct)
  const isThreadFromDirect = (doc.parentInfo ?? []).some((it) =>
    control.hierarchy.isDerived(it._class, communication.type.Direct)
  )

  if (!isDirect && !isThreadFromDirect) return []

  delete updateTx.operations.title
  delete updateTx.operations.parentInfo
  delete updateTx.operations.parent
  delete updateTx.operations.$inc

  const peers = (
    (
      await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
        findPeers: { params: { kind: 'card', cardId: doc._id } }
      })
    ).value as CardPeer[]
  ).flatMap((it) => it.members)

  const res: Tx[] = []
  for (const peer of peers) {
    res.push(control.txFactory.createTxUpdateDoc(doc._class, peer.extra.space, peer.cardId, updateTx.operations))
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

async function OnThreadCreate (ctx: TxCreateDoc<Card>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of ctx) {
    if (tx.space === core.space.DerivedTx) continue
    const doc = TxProcessor.createDoc2Doc(tx)
    const parent = doc.parentInfo?.[0]
    if (parent == null) continue
    if (!control.hierarchy.isDerived(parent._class, communication.type.Direct)) continue
    const direct = (await control.findAll(control.ctx, parent._class, { _id: parent._id }, { limit: 1 }))[0] as Direct
    if (direct == null) continue

    res.push(...(await createThreadCardPeers(direct, doc, control)))
  }

  return res
}

async function createThreadCardPeers (direct: Direct, doc: Card, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const cardIds = new Map<Ref<Card>, Ref<Space>>([[doc._id, doc.space]])
  const members = direct.members ?? []
  if (members.length === 0) return []

  const thread = (
    await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
      findThreads: { params: { threadId: doc._id } }
    })
  ).value[0]
  if (thread === undefined) return []

  const messageId = thread.messageId
  const directPeer = (
    (
      await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
        findPeers: { params: { kind: 'card', cardId: direct._id } }
      })
    ).value as CardPeer[]
  )[0]

  const personSpaces = (await getPersonSpaces(control)).filter(
    (it) => it._id !== doc.space && members.includes(it.person)
  )
  if (personSpaces.length === 0) return []
  const accounts = (
    await control.findAll(control.ctx, contact.mixin.Employee, {
      _id: { $in: personSpaces.map((it) => it.person) as Ref<Employee>[] }
    })
  )
    .map((it) => it.personUuid)
    .filter(notEmpty)
  if (accounts.length === 0) return []

  // TODO: create directs in person_workspace
  for (const personSpace of personSpaces) {
    const _id = generateId<Card>()
    const _class = doc._class
    cardIds.set(_id, personSpace._id)
    res.push(
      control.txFactory.createTxCreateDoc(
        _class,
        personSpace._id,
        {
          ...doc
        },
        _id
      )
    )

    const parentDirect = directPeer?.members?.find((m) => m.extra?.space === personSpace._id)

    if (parentDirect !== undefined) {
      const threadPatchEvent: ThreadPatchEvent = {
        type: MessageEventType.ThreadPatch,
        cardId: parentDirect.cardId,
        messageId,
        operation: {
          opcode: 'attach',
          threadId: _id,
          threadType: _class
        },
        socialId: doc.modifiedBy
      }
      await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
        event: threadPatchEvent
      })
    }
  }

  if (cardIds.size > 1) {
    const group = generateId()
    for (const [cardId, spaceId] of cardIds.entries()) {
      const event: CreatePeerEvent = {
        type: PeerEventType.CreatePeer,
        workspaceId: control.workspace.uuid, // TODO: person_workspace
        cardId,
        kind: 'card',
        value: group,
        extra: { space: spaceId },
        date: new Date(doc.modifiedOn)
      }
      await control.domainRequest(control.ctx, 'communication' as OperationDomain, { event })
    }
  }

  return res
}

function getDirectTitle (employees: Employee[], me: Ref<Person>): string {
  if (employees.length === 1) {
    return employees.map((e) => formatName(e.name)).join(', ')
  } else {
    return employees
      .filter((it) => it._id !== me)
      .map((e) => formatName(e.name))
      .join(', ')
  }
}

async function createDirectCardPeers (doc: Card, members: Ref<Person>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const cardIds = new Map<Ref<Card>, Ref<Space>>([[doc._id, doc.space]])
  if (members.length === 0) return []

  const personSpaces = (await getPersonSpaces(control)).filter((it) => members.includes(it.person))
  if (personSpaces.length <= 1) return []
  const employees = await control.findAll(control.ctx, contact.mixin.Employee, {
    _id: { $in: personSpaces.map((it) => it.person) as Ref<Employee>[] }
  })
  const accounts = employees.map((it) => it.personUuid).filter(notEmpty)
  if (accounts.length === 0) return []

  // TODO: create directs in person_workspace
  for (const personSpace of personSpaces) {
    if (personSpace._id === doc.space) continue
    const _id = generateId<Card>()
    const _class = doc._class
    cardIds.set(_id, personSpace._id)
    const title = getDirectTitle(employees, personSpace.person)

    res.push(
      control.txFactory.createTxCreateDoc(
        _class,
        personSpace._id,
        {
          ...doc,
          title
        },
        _id
      )
    )

    const event: AddCollaboratorsEvent = {
      type: NotificationEventType.AddCollaborators,
      cardId: _id,
      cardType: _class,
      collaborators: accounts,
      socialId: doc.modifiedBy,
      date: new Date(doc.modifiedOn + 1)
    }

    await control.domainRequest(control.ctx, 'communication' as OperationDomain, { event })
  }

  if (cardIds.size > 1) {
    const group = generateId()
    for (const [cardId, spaceId] of cardIds.entries()) {
      const event: CreatePeerEvent = {
        type: PeerEventType.CreatePeer,
        workspaceId: control.workspace.uuid, // TODO: person_workspace
        cardId,
        kind: 'card',
        value: group,
        extra: { space: spaceId },
        date: new Date(doc.modifiedOn)
      }
      await control.domainRequest(control.ctx, 'communication' as OperationDomain, { event })
    }
  }

  return res
}

async function OnDirectCreate (ctx: TxCreateDoc<Direct>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []

  for (const tx of ctx) {
    if (tx.space === core.space.DerivedTx) continue
    const doc = TxProcessor.createDoc2Doc(tx)
    const members = doc.members ?? []

    res.push(...(await createDirectCardPeers(doc, members, control)))
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
      if ((doc.parentInfo?.length ?? 0) === 0) {
        const parentInfo = [
          ...(parent.parentInfo ?? []),
          {
            _id: parent._id,
            _class: parent._class,
            title: parent.title
          }
        ]
        res.push(
          control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            parentInfo
          })
        )
      }
    }
  }

  await updateCollaborators(control, ctx)

  return res
}

async function updateCollaborators (control: TriggerControl, ctx: TxCreateDoc<Card>[]): Promise<void> {
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
    const event: AddCollaboratorsEvent = {
      type: NotificationEventType.AddCollaborators,
      cardId: tx.objectId,
      cardType: tx.objectClass,
      collaborators,
      socialId: tx.createdBy ?? tx.modifiedBy,
      date: new Date((tx.createdOn ?? tx.modifiedOn) + 1)
    }
    await control.domainRequest(control.ctx, 'communication' as OperationDomain, {
      event
    })
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
    OnCardTag,
    OnDirectCreate,
    OnThreadCreate
  }
})
