//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import core, { Hierarchy, AnyAttribute, Storage, DocumentQuery, FindOptions, FindResult, TxProcessor, TxMixin, TxPutBag, TxRemoveDoc } from '@anticrm/core'
import type { AttachedDoc, TxUpdateDoc, TxCreateDoc, Doc, Ref, Class, Obj, TxResult } from '@anticrm/core'

import type { IndexedDoc, FullTextAdapter, WithFind } from './types'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const NO_INDEX = [] as AnyAttribute[]

export class FullTextIndex extends TxProcessor implements Storage {
  private readonly indexes = new Map<Ref<Class<Obj>>, AnyAttribute[]>()

  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly adapter: FullTextAdapter,
    private readonly dbStorage: WithFind
  ) {
    super()
  }

  protected override async txPutBag (tx: TxPutBag<any>): Promise<TxResult> {
    console.log('FullTextIndex.txPutBag: Method not implemented.')
    return {}
  }

  protected override async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult> {
    console.log('FullTextIndex.txRemoveDoc: Method not implemented.')
    return {}
  }

  protected txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  async findAll<T extends Doc> (_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    console.log('search', query)
    const docs = await this.adapter.search(query)
    console.log(docs)
    const ids = docs.map(doc => (doc.attachedTo ?? doc.id) as Ref<T>)
    return await this.dbStorage.findAll(_class, { _id: { $in: ids as any } }, options) // TODO: remove `as any`
  }

  private getFullTextAttributes (clazz: Ref<Class<Obj>>): AnyAttribute[] | undefined {
    const attributes = this.indexes.get(clazz)
    if (attributes === undefined) {
      const allAttributes = this.hierarchy.getAllAttributes(clazz)
      const result: AnyAttribute[] = []
      for (const [, attr] of allAttributes) {
        if (attr.type._class === core.class.TypeString) {
          result.push(attr)
        }
      }
      if (result.length > 0) {
        this.indexes.set(clazz, result)
        return result
      } else {
        this.indexes.set(clazz, NO_INDEX)
      }
    } else if (attributes !== NO_INDEX) {
      return attributes
    }
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    const attributes = this.getFullTextAttributes(tx.objectClass)
    if (attributes === undefined) return {}
    const doc = TxProcessor.createDoc2Doc(tx)
    const content = attributes.map(attr => (doc as any)[attr.name]) // buildContent(doc, attributes) // (doc as any)[attribute.name]
    const indexedDoc: IndexedDoc = {
      id: doc._id,
      _class: doc._class,
      modifiedBy: doc.modifiedBy,
      modifiedOn: doc.modifiedOn,
      space: doc.space,
      attachedTo: (doc as AttachedDoc).attachedTo,
      content0: content[0],
      content1: content[1],
      content2: content[2],
      content3: content[3],
      content4: content[4],
      content5: content[5],
      content6: content[6],
      content7: content[7],
      content8: content[8],
      content9: content[9]
    }
    return await this.adapter.index(indexedDoc)
  }

  protected override async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult> {
    const attributes = this.getFullTextAttributes(tx.objectClass)
    if (attributes === undefined) return {}
    const ops: any = tx.operations
    const update: any = {}
    let i = 0
    let shouldUpdate = false
    for (const attr of attributes) {
      if (ops[attr.name] !== undefined) {
        update[`content${i}`] = ops[attr.name]
        shouldUpdate = true
        i++
      }
    }
    if (shouldUpdate) {
      return await this.adapter.update(tx.objectId, update)
    }
    return {}
  }
}
