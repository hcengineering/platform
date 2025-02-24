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

import core, {
  PersonId,
  AttachedDoc,
  Attribute,
  Class,
  Classifier,
  ClassifierKind,
  Data,
  DateRangeMode,
  Doc,
  Domain,
  Enum,
  EnumOf,
  Hierarchy,
  Hyperlink,
  Mixin as IMixin,
  IndexKind,
  Interface,
  Markup,
  MarkupBlobRef,
  MixinData,
  Obj,
  PropertyType,
  Rank,
  Ref,
  RefTo,
  Space,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxFactory,
  TxProcessor,
  Type,
  TypeAny as TypeAnyType,
  ArrOf as TypeArrOf,
  Collection as TypeCollection,
  TypeDate as TypeDateType,
  generateId
} from '@hcengineering/core'
import type { Asset, IntlString } from '@hcengineering/platform'
import toposort from 'toposort'

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
  _id: Ref<Classifier>
  extends?: Ref<Class<Obj>>
  implements?: Ref<Interface<Doc>>[]
  domain?: Domain
  label: IntlString
  icon?: Asset
  txes: Array<Tx>
  kind: ClassifierKind
  shortLabel?: string | IntlString
  sortingKey?: string
  filteringKey?: string
  pluralLabel?: IntlString
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

const attributes = new Map<any, Map<string, Record<string, any>>>()
function setAttr (target: any, prop: string, key: string, value: any): void {
  const props = attributes.get(target) ?? new Map<string, Record<string, any>>()
  const attrs = props.get(prop) ?? {}
  attrs[key] = value

  props.set(prop, attrs)
  attributes.set(target, props)
}

function clearAttrs (target: any, prop: string): void {
  const props = attributes.get(target)
  props?.delete(prop)

  if (props !== undefined && props.size === 0) {
    attributes.delete(target)
  }
}

function getAttrs (target: any, prop: string): Record<string, any> {
  return attributes.get(target)?.get(prop) ?? {}
}

/**
 * @public
 */
export function Prop (type: Type<PropertyType>, label: IntlString, extra: Partial<Attribute<PropertyType>> = {}) {
  return function (target: any, propertyKey: string): void {
    const txes = getTxes(target)
    const tx: TxCreateDoc<Attribute<PropertyType>> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: core.space.Model,
      objectId: extra._id ?? (propertyKey as Ref<Attribute<PropertyType>>),
      objectClass: core.class.Attribute,
      attributes: {
        ...extra,
        name: propertyKey,
        index: getIndex(target, propertyKey),
        type,
        label,
        attributeOf: txes._id, // undefined, need to fix later
        ...getAttrs(target, propertyKey)
      }
    }

    clearAttrs(target, propertyKey)

    txes.txes.push(tx)
  }
}

/**
 * @public
 */
export function Hidden () {
  return function (target: any, propertyKey: string): void {
    setAttr(target, propertyKey, 'hidden', true)
  }
}

/**
 * @public
 */
export function ReadOnly () {
  return function (target: any, propertyKey: string): void {
    setAttr(target, propertyKey, 'readonly', true)
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
  domain?: Domain,
  _implements?: Ref<Interface<Doc>>[]
) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes._id = _class
    txes.extends = _class !== core.class.Obj ? _extends : undefined
    txes.implements = _implements
    txes.domain = domain
    txes.kind = ClassifierKind.CLASS
  }
}

/**
 * @public
 */
export function Implements<T extends Doc> (_interface: Ref<Interface<T>>, _extends?: Ref<Interface<Doc>>[]) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes._id = _interface
    txes.implements = _extends
    txes.kind = ClassifierKind.INTERFACE
  }
}

/**
 * @public
 */
export function Mixin<T extends Obj> (_class: Ref<Class<T>>, _extends: Ref<Class<Obj>>) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes._id = _class
    txes.extends = _extends
    txes.kind = ClassifierKind.MIXIN
  }
}

/**
 * @public
 */
export function UX<T extends Obj> (
  label: IntlString,
  icon?: Asset,
  shortLabel?: string,
  sortingKey?: string,
  filteringKey?: string,
  pluralLabel?: IntlString
) {
  return function classDecorator<C extends new () => T> (constructor: C): void {
    const txes = getTxes(constructor.prototype)
    txes.label = label
    txes.icon = icon
    txes.shortLabel = shortLabel
    txes.sortingKey = sortingKey
    txes.filteringKey = filteringKey ?? sortingKey
    txes.pluralLabel = pluralLabel
  }
}

function generateIds (objectId: Ref<Doc>, txes: TxCreateDoc<Attribute<PropertyType>>[]): Tx[] {
  return txes.map((tx) => {
    const withId = {
      ...tx,
      // Do not override custom attribute id if specified
      objectId: tx.objectId !== tx.attributes.name ? tx.objectId : `${objectId}_${tx.objectId}`
    }
    withId.attributes.attributeOf = objectId as Ref<Class<Obj>>
    return withId
  })
}

const txFactory = new TxFactory(core.account.System)

function _generateTx (tx: ClassTxes): Tx[] {
  const objectId = tx._id
  const _cl = {
    [ClassifierKind.CLASS]: core.class.Class,
    [ClassifierKind.INTERFACE]: core.class.Interface,
    [ClassifierKind.MIXIN]: core.class.Mixin
  }
  const createTx = txFactory.createTxCreateDoc<Classifier>(
    _cl[tx.kind],
    core.space.Model,
    {
      ...(tx.domain !== undefined ? { domain: tx.domain } : {}),
      kind: tx.kind,
      label: tx.label,
      icon: tx.icon,
      ...(tx.kind === ClassifierKind.INTERFACE
        ? { extends: tx.implements }
        : { extends: tx.extends, implements: tx.implements }),
      ...(tx.kind === ClassifierKind.INTERFACE
        ? { extends: tx.implements }
        : {
            shortLabel: tx.shortLabel,
            sortingKey: tx.sortingKey,
            filteringKey: tx.filteringKey,
            pluralLabel: tx.pluralLabel
          })
    },
    objectId
  )
  return [createTx, ...generateIds(objectId, tx.txes as TxCreateDoc<Attribute<PropertyType>>[])]
}

/**
 * @public
 */
export class Builder {
  private readonly txes: Tx[] = []
  readonly hierarchy = new Hierarchy()

  onTx?: (tx: Tx) => void

  createModel (...classes: Array<new () => Obj>): void {
    const txes = classes.map((ctor) => getTxes(ctor.prototype))
    const byId = new Map<string, ClassTxes>()

    txes.forEach((tx) => {
      byId.set(tx._id, tx)
    })

    Array.from(byId.entries()).forEach(([id, txes]) => {
      if (txes.kind === ClassifierKind.CLASS && txes.domain !== undefined && txes.extends !== undefined) {
        let parentTxes: ClassTxes | undefined = txes
        let parentDomain: Domain | undefined
        do {
          parentTxes = parentTxes.extends === undefined ? undefined : byId.get(parentTxes.extends)
          parentDomain = parentTxes === undefined ? undefined : parentTxes.domain
        } while (parentTxes !== undefined && parentDomain === undefined)
        if (parentDomain !== undefined) {
          throw new Error(
            `Class '${id}' should not specify its own domain '${txes.domain}', as it already extends class '${parentTxes?._id}' in domain '${parentDomain}'`
          )
        }
      }
    })

    const generated = this.generateTransactions(txes, byId)

    for (const tx of generated) {
      this.txes.push(tx)
      this.onTx?.(tx)
      this.hierarchy.tx(tx)
    }
  }

  private generateTransactions (txes: ClassTxes[], byId: Map<string, ClassTxes>): Tx[] {
    const graph = this.createGraph(txes)
    const sorted = toposort(graph)
      .reverse()
      .map((edge) => byId.get(edge))
    return sorted.flatMap((tx) => (tx != null ? _generateTx(tx) : []))
  }

  private createGraph (txes: ClassTxes[]): [string, string | undefined][] {
    return txes.map((tx) => [tx._id, tx.extends] as [string, string | undefined])
  }

  // do we need this?
  createDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    objectId?: Ref<T>,
    modifiedBy?: PersonId
  ): T {
    const tx = txFactory.createTxCreateDoc(_class, space, attributes, objectId)
    if (modifiedBy !== undefined) {
      tx.modifiedBy = modifiedBy
    }
    this.txes.push(tx)
    this.onTx?.(tx)
    this.hierarchy.tx(tx)
    return TxProcessor.createDoc2Doc(tx)
  }

  mixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    mixin: Ref<IMixin<M>>,
    attributes: MixinData<D, M>
  ): void {
    const tx = txFactory.createTxMixin(objectId, objectClass, core.space.Model, mixin, attributes)
    this.txes.push(tx)
    this.onTx?.(tx)
    this.hierarchy.tx(tx)
  }

  getTxes (): Tx[] {
    return [...this.txes]
  }
}

// T Y P E S

/**
 * @public
 */
export function TypeString (): Type<string> {
  return { _class: core.class.TypeString, label: core.string.String, icon: core.icon.TypeString }
}

/**
 * @public
 */
export function TypeRelation (): Type<string> {
  return { _class: core.class.TypeRelation, label: core.string.Relation, icon: core.icon.TypeRef }
}

/**
 * @public
 */
export function TypeBlob (): Type<string> {
  return { _class: core.class.TypeBlob, label: core.string.String, icon: core.icon.TypeBlob }
}

/**
 * @public
 */
export function TypeHyperlink (): Type<Hyperlink> {
  return { _class: core.class.TypeHyperlink, label: core.string.Hyperlink, icon: core.icon.TypeHyperlink }
}

/**
 * @public
 */
export function TypeNumber (): Type<number> {
  return { _class: core.class.TypeNumber, label: core.string.Number, icon: core.icon.TypeNumber }
}

/**
 * @public
 */
export function TypeMarkup (): Type<Markup> {
  return { _class: core.class.TypeMarkup, label: core.string.Markup, icon: core.icon.TypeMarkup }
}

/**
 * @public
 */
export function TypeRecord (): Type<Record<any, any>> {
  return { _class: core.class.TypeRecord, label: core.string.Record, icon: core.icon.TypeRecord }
}

/**
 * @public
 */
export function TypeIntlString (): Type<IntlString> {
  return { _class: core.class.TypeIntlString, label: core.string.IntlString, icon: core.icon.TypeRef }
}

/**
 * @public
 */
export function TypeBoolean (): Type<boolean> {
  return { _class: core.class.TypeBoolean, label: core.string.Boolean, icon: core.icon.TypeBoolean }
}

/**
 * @public
 */
export function TypeTimestamp (): Type<Timestamp> {
  return { _class: core.class.TypeTimestamp, label: core.string.Timestamp, icon: core.icon.TypeDate }
}

/**
 * @public
 */
export function TypeDate (mode: DateRangeMode = DateRangeMode.DATE, withShift: boolean = true): TypeDateType {
  return { _class: core.class.TypeDate, label: core.string.Date, icon: core.icon.TypeDate, mode, withShift }
}

/**
 * @public
 */
export function TypeRef (_class: Ref<Class<Doc>>): RefTo<Doc> {
  return { _class: core.class.RefTo, label: core.string.Ref, icon: core.icon.TypeRef, to: _class }
}

/**
 * @public
 */
export function TypeEnum (of: Ref<Enum>): EnumOf {
  return { _class: core.class.EnumOf, label: core.string.Enum, icon: core.icon.TypeEnumOf, of }
}

/**
 * @public
 */
export function TypeFileSize (): Type<number> {
  return { _class: core.class.TypeFileSize, label: core.string.Size, icon: core.icon.TypeNumber }
}

/**
 * @public
 */
export function TypeAny<AnyComponent = any> (
  presenter: AnyComponent,
  label: IntlString,
  editor?: AnyComponent
): TypeAnyType<AnyComponent> {
  return { _class: core.class.TypeAny, label, presenter, editor }
}

/**
 * @public
 */
export function Collection<T extends AttachedDoc> (clazz: Ref<Class<T>>, itemLabel?: IntlString): TypeCollection<T> {
  return {
    _class: core.class.Collection,
    label: core.string.Collection,
    icon: core.icon.TypeCollection,
    of: clazz,
    itemLabel
  }
}

/**
 * @public
 */
export function ArrOf<T extends PropertyType | Ref<Doc>> (type: Type<T>): TypeArrOf<T> {
  return { _class: core.class.ArrOf, label: core.string.Array, of: type, icon: core.icon.TypeArray }
}

/**
 * @public
 */
export function TypeCollaborativeDoc (): Type<MarkupBlobRef> {
  return { _class: core.class.TypeCollaborativeDoc, label: core.string.MarkupBlobRef, icon: core.icon.TypeMarkup }
}

/**
 * @public
 */
export function TypeRank (): Type<Rank> {
  return { _class: core.class.TypeRank, label: core.string.Rank, icon: core.icon.TypeRank }
}

export function TypePersonId (): Type<PersonId> {
  return { _class: core.class.TypePersonId, label: core.string.PersonId }
}
