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

import type { Ref, Class, Obj, Domain, Mixin, Doc, AnyAttribute } from './classes'
import { ClassifierKind } from './classes'
import { Tx, TxCreateDoc, TxMixin, TxProcessor } from './tx'

import core from './component'

/**
 * @public
 */
export class Hierarchy {
  private readonly classes = new Map<Ref<Class<Obj>>, Class<Obj>>()
  private readonly attributes = new Map<Ref<Class<Obj>>, Map<string, AnyAttribute>>()
  private readonly descendants = new Map<Ref<Class<Obj>>, Ref<Class<Obj>>[]>()
  private readonly ancestors = new Map<Ref<Class<Obj>>, Ref<Class<Obj>>[]>()
  private readonly proxies = new Map<Ref<Mixin<Doc>>, ProxyHandler<Doc>>()

  private createMixinProxyHandler (mixin: Ref<Mixin<Doc>>): ProxyHandler<Doc> {
    const value = this.getClass(mixin)
    const ancestor = this.getClass(value.extends as Ref<Class<Obj>>)
    const ancestorProxy = ancestor.kind === ClassifierKind.MIXIN ? this.getMixinProxyHandler(ancestor._id) : null
    return {
      get (target: any, property: string, receiver: any): any {
        const value = target[mixin]?.[property]
        if (value === undefined) { return (ancestorProxy !== null) ? ancestorProxy.get?.(target, property, receiver) : target[property] }
        return value
      }
    }
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

  getAncestors (_class: Ref<Class<Obj>>): Ref<Class<Obj>>[] {
    const result = this.ancestors.get(_class)
    if (result === undefined) {
      throw new Error('ancestors not found: ' + _class)
    }
    return result
  }

  getClass (_class: Ref<Class<Obj>>): Class<Obj> {
    const data = this.classes.get(_class)
    if (data === undefined) {
      throw new Error('class not found: ' + _class)
    }
    return data
  }

  getDomain (_class: Ref<Class<Obj>>): Domain {
    const klazz = this.getClass(_class)
    if (klazz.domain !== undefined) {
      return klazz.domain
    }
    if (klazz.extends !== undefined) {
      const domain = this.getDomain(klazz.extends)
      klazz.domain = domain
      return domain
    }
    throw new Error('domain not found: ' + _class)
  }

  tx (tx: Tx): void {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        this.txCreateDoc(tx as TxCreateDoc<Doc>)
        return
      case core.class.TxMixin:
        this.txMixin(tx as TxMixin<Doc, Doc>)
    }
  }

  private txCreateDoc (tx: TxCreateDoc<Doc>): void {
    if (tx.objectClass === core.class.Class) {
      const createTx = tx as TxCreateDoc<Class<Obj>>
      const _id = createTx.objectId
      this.classes.set(_id, TxProcessor.createDoc2Doc(createTx))
      this.addAncestors(_id)
      this.addDescendant(_id)
    } else if (tx.objectClass === core.class.Attribute) {
      const createTx = tx as TxCreateDoc<AnyAttribute>
      this.addAttribute(TxProcessor.createDoc2Doc(createTx))
    }
  }

  private txMixin (tx: TxMixin<Doc, Doc>): void {
    if (tx.objectClass === core.class.Class) {
      const obj = this.getClass(tx.objectId as Ref<Class<Obj>>) as any
      obj[tx.mixin] = tx.attributes
    }
  }

  isDerived<T extends Obj>(_class: Ref<Class<T>>, from: Ref<Class<T>>): boolean {
    let cl: Ref<Class<Obj>> | undefined = _class
    while (cl !== undefined) {
      if (cl === from) return true
      const attrs = this.classes.get(cl)
      cl = attrs?.extends
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

  private addDescendant<T extends Obj>(_class: Ref<Class<T>>): void {
    const hierarchy = this.getAncestors(_class)
    for (const cls of hierarchy) {
      const list = this.descendants.get(cls)
      if (list === undefined) {
        this.descendants.set(cls, [_class])
      } else {
        list.push(_class)
      }
    }
  }

  private addAncestors<T extends Obj>(_class: Ref<Class<T>>): void {
    let cl: Ref<Class<Obj>> | undefined = _class
    while (cl !== undefined) {
      const list = this.ancestors.get(_class)
      if (list === undefined) {
        this.ancestors.set(_class, [cl])
      } else {
        list.push(cl)
      }
      const attrs = this.classes.get(cl)
      cl = attrs?.extends
    }
  }

  private addAttribute (attribute: AnyAttribute): void {
    const _class = attribute.attributeOf
    let attributes = this.attributes.get(_class)
    if (attributes === undefined) {
      attributes = new Map<string, AnyAttribute>()
      this.attributes.set(_class, attributes)
    }
    attributes.set(attribute.name, attribute)
  }

  getAttributes (clazz: Ref<Class<Obj>>): Map<string, AnyAttribute> {
    const attributes = this.attributes.get(clazz)
    if (attributes === undefined) {
      throw new Error('attributes not found for class ' + clazz)
    }
    return attributes
  }

  getAttribute (_class: Ref<Class<Obj>>, name: string): AnyAttribute {
    const attribute = this.attributes.get(_class)?.get(name)
    if (attribute === undefined) {
      const clazz = this.getClass(_class)
      if (clazz.extends !== undefined) {
        return this.getAttribute(clazz.extends, name)
      } else {
        throw new Error('attribute not found: ' + name)
      }
    }
    return attribute
  }
}
