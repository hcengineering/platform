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

import core, { TxCreateDoc, Doc, Ref, Class, Obj, Hierarchy, AnyAttribute, Storage, DocumentQuery, FindOptions, FindResult, TxProcessor } from '@anticrm/core'
import type { AttachedDoc } from '@anticrm/core'

import type { IndexedDoc, FullTextAdapter, WithFind } from './types'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const NO_INDEX = [] as AnyAttribute[]

function buildContent (doc: any, attributes: AnyAttribute[]): string {
  let result = ''
  for (const attr of attributes) {
    const value = doc[attr.name]
    if (value !== undefined) {
      result += value as string
      result += ' '  
    }
  }
  return result
}

export class FullTextIndex extends TxProcessor implements Storage {
  private readonly indexes = new Map<Ref<Class<Obj>>, AnyAttribute[]>()

  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly adapter: FullTextAdapter,
    private readonly dbStorage: WithFind
  ) {
    super()
  }

  async findAll<T extends Doc> (_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    console.log('search', query)
    const docs = await this.adapter.search(query)
    console.log(docs)
    const ids = docs.map(doc => (doc.attachedTo ?? doc.id) as Ref<T>)
    return this.dbStorage.findAll(_class, { _id: { $in: ids as any } }, options) // TODO: remove `as any`
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

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    const attributes = this.getFullTextAttributes(tx.objectClass)
    if (attributes === undefined) return
    const doc = TxProcessor.createDoc2Doc(tx)
    const content = buildContent(doc, attributes) // (doc as any)[attribute.name]
    const indexedDoc: IndexedDoc = {
      id: doc._id,
      _class: doc._class,
      modifiedBy: doc.modifiedBy,
      modifiedOn: doc.modifiedOn,
      space: doc.space,
      attachedTo: (doc as AttachedDoc).attachedTo,
      content
    }
    return await this.adapter.index(indexedDoc)
  }
}
