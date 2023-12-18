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

import { FindOptions, Lookup, ToClassRefT, WithLookup } from '.'
import type { AnyAttribute, Class, Classifier, Doc, Domain, Interface, Mixin, Obj, Ref } from './classes'
import { ClassifierKind } from './classes'
import core from './component'
import { _createMixinProxy, _mixinClass, _toDoc } from './proxy'
import type { Tx, TxCreateDoc, TxMixin, TxRemoveDoc, TxUpdateDoc } from './tx'
import { TxProcessor } from './tx'
import { getTypeOf } from './typeof'

/**
 * @public
 */
export class Hierarchy {
  private readonly classifiers = new Map<Ref<Classifier>, Classifier>()
  private readonly attributes = new Map<Ref<Classifier>, Map<string, AnyAttribute>>()
  private readonly attributesById = new Map<Ref<AnyAttribute>, AnyAttribute>()
  private readonly descendants = new Map<Ref<Classifier>, Ref<Classifier>[]>()
  private readonly ancestors = new Map<Ref<Classifier>, Ref<Classifier>[]>()
  private readonly proxies = new Map<Ref<Mixin<Doc>>, ProxyHandler<Doc>>()

  private readonly classifierProperties = new Map<Ref<Classifier>, Record<string, any>>()

  private createMixinProxyHandler (mixin: Ref<Mixin<Doc>>): ProxyHandler<Doc> {
    const value = this.getClass(mixin)
    const ancestor = this.getClass(value.extends as Ref<Class<Obj>>)
    const ancestorProxy = ancestor.kind === ClassifierKind.MIXIN ? this.getMixinProxyHandler(ancestor._id) : null
    return _createMixinProxy(value, ancestorProxy)
  }

  private getMixinProxyHandler (mixin: Ref<Mixin<Doc>>): ProxyHandler<Doc> {
    const handler = this.proxies.get(mixin)
    if (handler === undefined) {
      const handler = this.createMixinProxyHandler(mixin)
      this.proxies.set(mixin, handler)
      return handler
    }
    return handler
  }

  as<D extends Doc, M extends D>(doc: D, mixin: Ref<Mixin<M>>): M {
    return new Proxy(doc, this.getMixinProxyHandler(mixin)) as M
  }

  static toDoc<D extends Doc>(doc: D): D {
    return _toDoc(doc)
  }

  static mixinClass<D extends Doc, M extends D>(doc: D): Ref<Mixin<M>> | undefined {
    return _mixinClass(doc)
  }

  static mixinOrClass<D extends Doc, M extends D>(doc: D): Ref<Mixin<M> | Class<Doc>> {
    const m = _mixinClass(doc)
    return m ?? doc._class
  }

  hasMixin<D extends Doc, M extends D>(doc: D, mixin: Ref<Mixin<M>>): boolean {
    const d = Hierarchy.toDoc(doc)
    return typeof (d as any)[mixin] === 'object'
  }

  classHierarchyMixin<D extends Doc, M extends D>(
    _class: Ref<Class<D>>,
    mixin: Ref<Mixin<M>>,
    filter?: (value: M) => boolean
  ): M | undefined {
    let clazz = this.getClass(_class)
    while (true) {
      if (this.hasMixin(clazz, mixin)) {
        const m = this.as(clazz, mixin) as any as M
        if (m !== undefined && (filter?.(m) ?? true)) {
          return m
        }
      }
      if (clazz.extends === undefined) return
      clazz = this.getClass(clazz.extends)
    }
  }

  findClassOrMixinMixin<D extends Doc, M extends D>(doc: Doc, mixin: Ref<Mixin<M>>): M | undefined {
    const cc = this.classHierarchyMixin(doc._class, mixin)
    if (cc !== undefined) {
      return cc
    }

    const _doc = _toDoc(doc)
    // Find all potential mixins of doc
    for (const [k, v] of Object.entries(_doc)) {
      if (typeof v === 'object' && this.classifiers.has(k as Ref<Classifier>)) {
        const cc = this.classHierarchyMixin(k as Ref<Mixin<Doc>>, mixin)
        if (cc !== undefined) {
          return cc
        }
      }
    }
  }

  findMixinMixins<D extends Doc, M extends D>(doc: Doc, mixin: Ref<Mixin<M>>): M[] {
    const _doc = _toDoc(doc)
    const result: M[] = []
    const resultSet = new Set<string>()
    // Find all potential mixins of doc
    for (const [k, v] of Object.entries(_doc)) {
      if (typeof v === 'object' && this.classifiers.has(k as Ref<Classifier>)) {
        const clazz = this.getClass(k as Ref<Classifier>)
        if (this.hasMixin(clazz, mixin)) {
          const cc = this.as(clazz, mixin) as any as M
          if (cc !== undefined && !resultSet.has(cc._id)) {
            result.push(cc)
            resultSet.add(cc._id)
          }
        }
      }
    }
    return result
  }

  isMixin (_class: Ref<Class<Doc>>): boolean {
    const data = this.classifiers.get(_class)
    return data !== undefined && this._isMixin(data)
  }

  getAncestors (_class: Ref<Classifier>): Ref<Classifier>[] {
    const result = this.ancestors.get(_class)
    if (result === undefined) {
      throw new Error('ancestors not found: ' + _class)
    }
    return result
  }

  getClass<T extends Obj = Obj>(_class: Ref<Class<T>>): Class<T> {
    const data = this.classifiers.get(_class)
    if (data === undefined || this.isInterface(data)) {
      throw new Error('class not found: ' + _class)
    }
    return data
  }

  hasClass<T extends Obj = Obj>(_class: Ref<Class<T>>): boolean {
    const data = this.classifiers.get(_class)

    return !(data === undefined || this.isInterface(data))
  }

  getClassOrInterface (_class: Ref<Class<Obj>>): Class<Obj> {
    const data = this.classifiers.get(_class)
    if (data === undefined) {
      throw new Error('class not found: ' + _class)
    }
    return data
  }

  getInterface (_interface: Ref<Interface<Doc>>): Interface<Doc> {
    const data = this.classifiers.get(_interface)
    if (data === undefined || !this.isInterface(data)) {
      throw new Error('interface not found: ' + _interface)
    }
    return data
  }

  getDomain (_class: Ref<Class<Obj>>): Domain {
    const domain = this.findDomain(_class)
    if (domain === undefined) {
      throw new Error(`domain not found: ${_class} `)
    }
    return domain
  }

  public findDomain (_class: Ref<Class<Doc>>): Domain | undefined {
    const klazz = this.getClass(_class)
    if (klazz.domain !== undefined) {
      return klazz.domain
    }

    let _klazz = klazz
    while (_klazz.extends !== undefined) {
      _klazz = this.getClass(_klazz.extends)
      if (_klazz.domain !== undefined) {
        // Cache for next requests
        klazz.domain = _klazz.domain
        return _klazz.domain
      }
    }
  }

  tx (tx: Tx): void {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        this.txCreateDoc(tx as TxCreateDoc<Doc>)
        return
      case core.class.TxUpdateDoc:
        this.txUpdateDoc(tx as TxUpdateDoc<Doc>)
        return
      case core.class.TxRemoveDoc:
        this.txRemoveDoc(tx as TxRemoveDoc<Doc>)
        return
      case core.class.TxMixin:
        this.txMixin(tx as TxMixin<Doc, Doc>)
    }
  }

  private txCreateDoc (tx: TxCreateDoc<Doc>): void {
    if (
      tx.objectClass === core.class.Class ||
      tx.objectClass === core.class.Interface ||
      tx.objectClass === core.class.Mixin
    ) {
      const _id = tx.objectId as Ref<Classifier>
      this.classifiers.set(_id, TxProcessor.createDoc2Doc(tx as TxCreateDoc<Classifier>))
      this.updateAncestors(_id)
      this.updateDescendant(_id)
    } else if (tx.objectClass === core.class.Attribute) {
      const createTx = tx as TxCreateDoc<AnyAttribute>
      this.addAttribute(TxProcessor.createDoc2Doc(createTx))
    }
  }

  private txUpdateDoc (tx: TxUpdateDoc<Doc>): void {
    if (tx.objectClass === core.class.Attribute) {
      const updateTx = tx as TxUpdateDoc<AnyAttribute>
      const doc = this.attributesById.get(updateTx.objectId)
      if (doc === undefined) return
      this.addAttribute(TxProcessor.updateDoc2Doc(doc, updateTx))

      this.classifierProperties.delete(doc.attributeOf)
    } else if (tx.objectClass === core.class.Mixin || tx.objectClass === core.class.Class) {
      const updateTx = tx as TxUpdateDoc<Mixin<Class<Doc>>>
      const doc = this.classifiers.get(updateTx.objectId)
      if (doc === undefined) return
      TxProcessor.updateDoc2Doc(doc, updateTx)
      this.classifierProperties.delete(doc._id)
    }
  }

  private txRemoveDoc (tx: TxRemoveDoc<Doc>): void {
    if (tx.objectClass === core.class.Attribute) {
      const removeTx = tx as TxRemoveDoc<AnyAttribute>
      const doc = this.attributesById.get(removeTx.objectId)
      if (doc === undefined) return
      const map = this.attributes.get(doc.attributeOf)
      map?.delete(doc.name)
      this.attributesById.delete(removeTx.objectId)
    } else if (tx.objectClass === core.class.Mixin) {
      const removeTx = tx as TxRemoveDoc<Mixin<Class<Doc>>>
      this.updateDescendant(removeTx.objectId, false)
      this.updateAncestors(removeTx.objectId, false)
      this.classifiers.delete(removeTx.objectId)
    }
  }

  private txMixin (tx: TxMixin<Doc, Doc>): void {
    if (this.isDerived(tx.objectClass, core.class.Class)) {
      const obj = this.getClass(tx.objectId as Ref<Class<Obj>>) as any
      TxProcessor.updateMixin4Doc(obj, tx)
    }
  }

  /**
   * Check if passed _class is derived from `from` class.
   * It will iterate over parents.
   */
  isDerived<T extends Obj>(_class: Ref<Class<T>>, from: Ref<Class<T>>): boolean {
    let cl: Ref<Class<T>> | undefined = _class
    while (cl !== undefined) {
      if (cl === from) return true
      cl = this.getClass(cl).extends
    }
    return false
  }

  /**
   * Return first non interface/mixin parent
   */
  getBaseClass<T extends Doc>(_class: Ref<Mixin<T>>): Ref<Class<T>> {
    let cl: Ref<Class<T>> | undefined = _class
    while (cl !== undefined) {
      const clz: Class<T> = this.getClass(cl)
      if (this.isClass(clz)) return cl
      cl = clz.extends
    }
    return core.class.Doc
  }

  /**
   * Check if passed _class implements passed interfaces `from`.
   * It will check for class parents and their interfaces.
   */
  isImplements<T extends Doc>(_class: Ref<Class<T>>, from: Ref<Interface<T>>): boolean {
    let cl: Ref<Class<T>> | undefined = _class
    while (cl !== undefined) {
      const klazz: Class<T> = this.getClass(cl)
      if (this.isExtends(klazz.implements ?? [], from)) {
        return true
      }
      cl = klazz.extends
    }
    return false
  }

  /**
   * Check if interface extends passed interface.
   */
  private isExtends<T extends Doc>(extendsOrImplements: Ref<Interface<Doc>>[], from: Ref<Interface<T>>): boolean {
    const result: Ref<Interface<Doc>>[] = []
    const toVisit = [...extendsOrImplements]
    while (toVisit.length > 0) {
      const ref = toVisit.shift() as Ref<Interface<Doc>>
      if (ref === from) {
        return true
      }
      addIf(result, ref)
      toVisit.push(...this.ancestorsOf(ref))
    }
    return false
  }

  getDescendants<T extends Obj>(_class: Ref<Class<T>>): Ref<Class<Obj>>[] {
    const data = this.descendants.get(_class)
    if (data === undefined) {
      throw new Error('descendants not found: ' + _class)
    }
    return data
  }

  private updateDescendant (_class: Ref<Classifier>, add = true): void {
    const hierarchy = this.getAncestors(_class)
    for (const cls of hierarchy) {
      const list = this.descendants.get(cls)
      if (list === undefined) {
        if (add) {
          this.descendants.set(cls, [_class])
        }
      } else {
        if (add) {
          list.push(_class)
        } else {
          const pos = list.indexOf(_class)
          if (pos !== -1) {
            list.splice(pos, 1)
          }
        }
      }
    }
  }

  private updateAncestors (_class: Ref<Classifier>, add = true): void {
    const cl: Ref<Classifier>[] = [_class]
    const visited = new Set<Ref<Classifier>>()
    while (cl.length > 0) {
      const classifier = cl.shift() as Ref<Classifier>
      if (addNew(visited, classifier)) {
        const list = this.ancestors.get(_class)
        if (list === undefined) {
          if (add) {
            this.ancestors.set(_class, [classifier])
          }
        } else {
          if (add) {
            addIf(list, classifier)
          } else {
            const pos = list.indexOf(classifier)
            if (pos !== -1) {
              list.splice(pos, 1)
            }
          }
        }
        cl.push(...this.ancestorsOf(classifier))
      }
    }
  }

  /**
   * Return extends and implemnets as combined list of references
   */
  private ancestorsOf (classifier: Ref<Classifier>): Ref<Classifier>[] {
    const attrs = this.classifiers.get(classifier)
    const result: Ref<Classifier>[] = []
    if (this.isClass(attrs) || this._isMixin(attrs)) {
      const cls = attrs as Class<Doc>
      if (cls.extends !== undefined) {
        result.push(cls.extends)
      }
      result.push(...(cls.implements ?? []))
    }
    if (this.isInterface(attrs)) {
      result.push(...((attrs as Interface<Doc>).extends ?? []))
    }
    return result
  }

  private isClass (attrs?: Classifier): boolean {
    return attrs?.kind === ClassifierKind.CLASS
  }

  private _isMixin (attrs?: Classifier): boolean {
    return attrs?.kind === ClassifierKind.MIXIN
  }

  private isInterface (attrs?: Classifier): boolean {
    return attrs?.kind === ClassifierKind.INTERFACE
  }

  private addAttribute (attribute: AnyAttribute): void {
    const _class = attribute.attributeOf
    let attributes = this.attributes.get(_class)
    if (attributes === undefined) {
      attributes = new Map<string, AnyAttribute>()
      this.attributes.set(_class, attributes)
    }
    attributes.set(attribute.name, attribute)
    this.attributesById.set(attribute._id, attribute)
    this.classifierProperties.delete(attribute.attributeOf)
  }

  getAllAttributes (
    clazz: Ref<Classifier>,
    to?: Ref<Classifier>,
    traverse?: (name: string, attr: AnyAttribute) => void
  ): Map<string, AnyAttribute> {
    const result = new Map<string, AnyAttribute>()
    let ancestors = this.getAncestors(clazz)
    if (to !== undefined) {
      const toAncestors = this.getAncestors(to)
      for (const uto of toAncestors) {
        if (ancestors.includes(uto)) {
          to = uto
          break
        }
      }
      ancestors = ancestors.filter(
        (c) => c !== to && (this.isInterface(this.classifiers.get(c)) || this.isDerived(c, to as Ref<Class<Doc>>))
      )
    }

    for (let index = ancestors.length - 1; index >= 0; index--) {
      const cls = ancestors[index]
      const attributes = this.attributes.get(cls)
      if (attributes !== undefined) {
        for (const [name, attr] of attributes) {
          traverse?.(name, attr)
          result.set(name, attr)
        }
      }
    }

    return result
  }

  getOwnAttributes (clazz: Ref<Classifier>): Map<string, AnyAttribute> {
    const result = new Map<string, AnyAttribute>()

    const attributes = this.attributes.get(clazz)
    if (attributes !== undefined) {
      for (const [name, attr] of attributes) {
        result.set(name, attr)
      }
    }

    return result
  }

  getParentClass (_class: Ref<Class<Obj>>): Ref<Class<Obj>> {
    const baseDomain = this.getDomain(_class)
    const ancestors = this.getAncestors(_class)
    let result: Ref<Class<Obj>> = _class
    for (const ancestor of ancestors) {
      try {
        const domain = this.getClass(ancestor).domain
        if (domain === baseDomain) {
          result = ancestor
        }
      } catch {}
    }
    return result
  }

  getAttribute (classifier: Ref<Classifier>, name: string): AnyAttribute {
    const attr = this.findAttribute(classifier, name)
    if (attr === undefined) {
      throw new Error('attribute not found: ' + name)
    }
    return attr
  }

  public findAttribute (classifier: Ref<Classifier>, name: string): AnyAttribute | undefined {
    const list = [classifier]
    const visited = new Set<Ref<Classifier>>()
    while (list.length > 0) {
      const cl = list.shift() as Ref<Classifier>
      if (addNew(visited, cl)) {
        const attribute = this.attributes.get(cl)?.get(name)
        if (attribute !== undefined) {
          return attribute
        }
        // Check ancestorsOf
        list.push(...this.ancestorsOf(cl))
      }
    }
  }

  updateLookupMixin<T extends Doc>(
    _class: Ref<Class<T>>,
    result: WithLookup<T>,
    options?: FindOptions<T>
  ): WithLookup<T> {
    const baseClass = this.getBaseClass(_class)
    const vResult = baseClass !== _class ? this.as(result, _class) : result
    const lookup = result.$lookup
    if (lookup !== undefined) {
      // We need to check if lookup type is mixin and cast to it if required.
      const lu = options?.lookup as Lookup<Doc>
      if (lu?._id !== undefined) {
        for (const [k, v] of Object.entries(lu._id)) {
          const _cl = getClass(v as ToClassRefT<T, keyof T>)
          if (this.isMixin(_cl)) {
            const mval = (lookup as any)[k]
            if (mval !== undefined) {
              if (Array.isArray(mval)) {
                ;(lookup as any)[k] = mval.map((it) => this.as(it, _cl))
              } else {
                ;(lookup as any)[k] = this.as(mval, _cl)
              }
            }
          }
        }
      }
      for (const [k, v] of Object.entries(lu ?? {})) {
        if (k === '_id') {
          continue
        }
        const _cl = getClass(v as ToClassRefT<T, keyof T>)
        if (this.isMixin(_cl)) {
          const mval = (lookup as any)[k]
          if (mval != null) {
            ;(lookup as any)[k] = this.as(mval, _cl)
          }
        }
      }
    }
    return vResult
  }

  clone (obj: any): any {
    if (typeof obj === 'undefined') {
      return undefined
    }
    if (typeof obj === 'function') {
      return obj
    }
    const isArray = Array.isArray(obj)
    const result: any = isArray ? [] : Object.assign({}, obj)
    for (const key in obj) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      if (type === 'Array') {
        result[key] = this.clone(value)
      } else if (type === 'Object') {
        const m = Hierarchy.mixinClass(value)
        const valClone = this.clone(value)
        result[key] = m !== undefined ? this.as(valClone, m) : valClone
      } else if (type === 'Date') {
        result[key] = new Date(value.getTime())
      } else {
        if (isArray) {
          result[key] = value
        }
      }
    }
    return result
  }

  domains (): Domain[] {
    const classes = Array.from(this.classifiers.values()).filter(
      (it) => this.isClass(it) || this._isMixin(it)
    ) as Class<Doc>[]
    return (classes.map((it) => it.domain).filter((it) => it !== undefined) as Domain[]).filter(
      (it, idx, array) => array.findIndex((pt) => pt === it) === idx
    )
  }

  getClassifierProp (cl: Ref<Class<Doc>>, prop: string): any | undefined {
    return this.classifierProperties.get(cl)?.[prop]
  }

  setClassifierProp (cl: Ref<Class<Doc>>, prop: string, value: any): void {
    const cur = this.classifierProperties.get(cl)
    this.classifierProperties.set(cl, { ...cur, [prop]: value })
  }
}

function addNew<T> (val: Set<T>, value: T): boolean {
  if (val.has(value)) {
    return false
  }
  val.add(value)
  return true
}

function addIf<T> (array: T[], value: T): void {
  if (!array.includes(value)) {
    array.push(value)
  }
}

function getClass<T extends Doc> (vvv: ToClassRefT<T, keyof T>): Ref<Class<T>> {
  if (Array.isArray(vvv)) {
    return vvv[0]
  }
  return vvv
}
