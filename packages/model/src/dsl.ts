//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type {
  Ref,
  Doc,
  Type,
  PropertyType,
  Attribute,
  Tx,
  Class,
  Obj,
  Data,
  TxCreateDoc,
  Domain,
  Mixin as IMixin,
  Space,
  ExtendedAttributes
} from '@anticrm/core'
import core, { ClassifierKind, IndexKind, generateId, TxFactory } from '@anticrm/core'
import type { IntlString, Asset } from '@anticrm/platform'
import toposort from 'toposort'

type NoIDs<T extends Tx> = Omit<T, '_id' | 'objectId'>

const targets = new Map<any, Map<string, IndexKind>>()

function setIndex (target: any, property: string, index: IndexKind): void {
  let indexes = targets.get(target)
  if (indexes === undefined) {
    indexes = new Map<string, IndexKind>()
    targets.set(target, indexes)
  }
  indexes.set(property, index)
}

function getIndex (target: any, property: string): IndexKind | undefined {
  return targets.get(target)?.get(property)
}

interface ClassTxes {
  _id: Ref<Class<Obj>>
  extends?: Ref<Class<Obj>>
  domain?: Domain
  label: IntlString
  icon?: Asset
  txes: Array<NoIDs<Tx>>
  kind: ClassifierKind
}

const transactions = new Map<any, ClassTxes>()

function getTxes (target: any): ClassTxes {
  const txes = transactions.get(target)
  if (txes === undefined) {
    const txes = { txes: [] } as unknown as ClassTxes
    transactions.set(target, txes)
    return txes
  }
  return txes
}

/**
 * @public
 * @param type -
 * @param label -
 * @param icon -
 * @returns
 */
export function Prop (type: Type<PropertyType>, label: IntlString, icon?: Asset) {
  return function (target: any, propertyKey: string): void {
    const txes = getTxes(target)
    const tx: NoIDs<TxCreateDoc<Attribute<PropertyType>>> = {
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: core.space.Model,
      objectClass: core.class.Attribute,
      attributes: {
        name: propertyKey,
        index: getIndex(target, propertyKey),
        type,
        label,
        icon,
        attributeOf: txes._id // undefined, need to fix later
      }
    }
    txes.txes.push(tx)
  }
}

/**
 * @public
 */
export function Index (kind: IndexKind) {
  return function (target: any, propertyKey: string): void {
    setIndex(target, propertyKey, kind)
  }
}

/**
 * @public
 */
export function Model<T extends Obj> (
  _class: Ref<Class<T>>,
  _extends: Ref<Class<Obj>>,
  domain?: Domain
) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes._id = _class
    txes.extends = _class !== core.class.Obj ? _extends : undefined
    txes.domain = domain
    txes.kind = ClassifierKind.CLASS
  }
}

/**
 * @public
 */
export function Mixin<T extends Obj> (
  _class: Ref<Class<T>>,
  _extends: Ref<Class<Obj>>
) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes._id = _class
    txes.extends = _extends
    txes.kind = ClassifierKind.MIXIN
  }
}

/**
 * @public
 * @param label -
 * @param icon -
 * @returns
 */
export function UX<T extends Obj> (
  label: IntlString,
  icon?: Asset
) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes.label = label
    txes.icon = icon
  }
}

function generateIds (objectId: Ref<Doc>, txes: NoIDs<TxCreateDoc<Attribute<PropertyType>>>[]): Tx[] {
  return txes.map((tx) => {
    const withId = {
      _id: generateId<Tx>(),
      objectId: generateId(),
      ...tx
    }
    withId.attributes.attributeOf = objectId as Ref<Class<Obj>>
    return withId
  })
}

const txFactory = new TxFactory(core.account.System)

function _generateTx (tx: ClassTxes): Tx[] {
  const objectId = tx._id
  const createTx = txFactory.createTxCreateDoc(
    core.class.Class,
    core.space.Model,
    {
      domain: tx.domain,
      kind: ClassifierKind.CLASS,
      extends: tx.extends,
      label: tx.label,
      icon: tx.icon
    },
    objectId
  )
  return [createTx, ...generateIds(objectId, tx.txes as NoIDs<TxCreateDoc<Attribute<PropertyType>>>[])]
}

/**
 * @public
 */
export class Builder {
  private readonly txes: Tx[] = []
  // private readonly hierarchy = new Hierarchy()

  createModel (...classes: Array<new () => Obj>): void {
    const txes = classes.map((ctor) => getTxes(ctor.prototype))
    const byId = new Map<string, ClassTxes>()

    txes.forEach((tx) => {
      byId.set(tx._id, tx)
    })

    const generated = this.generateTransactions(txes, byId)

    for (const tx of generated) {
      this.txes.push(tx)
      // this.hierarchy.tx(tx)
    }
  }

  private generateTransactions (
    txes: ClassTxes[],
    byId: Map<string, ClassTxes>
  ): Tx[] {
    const graph = this.createGraph(txes)
    const sorted = toposort(graph)
      .reverse()
      .map((edge) => byId.get(edge))
    return sorted.flatMap((tx) => (tx != null ? _generateTx(tx) : []))
  }

  private createGraph (txes: ClassTxes[]): [string, string | undefined][] {
    return txes.map(
      (tx) => [tx._id, tx.extends] as [string, string | undefined]
    )
  }

  // do we need this?
  createDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    objectId?: Ref<T>
  ): void {
    this.txes.push(
      txFactory.createTxCreateDoc(
        _class,
        space,
        attributes,
        objectId
      )
    )
  }

  mixin<D extends Doc, M extends D> (
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    mixin: Ref<IMixin<M>>,
    attributes: ExtendedAttributes<D, M>
  ): void {
    this.txes.push(txFactory.createTxMixin(objectId, objectClass, mixin, attributes))
  }

  getTxes (): Tx[] {
    return this.txes
  }
}

// T Y P E S

/**
 * @public
 */
export function TypeString (): Type<string> {
  return { _class: core.class.TypeString, label: 'TypeString' as IntlString }
}

/**
 * @public
 */
export function TypeBoolean (): Type<string> {
  return { _class: core.class.TypeBoolean, label: 'TypeBoolean' as IntlString }
}

/**
 * @public
 */
export function Bag (): Type<Record<string, PropertyType>> {
  return { _class: core.class.Bag, label: 'Bag' as IntlString }
}
