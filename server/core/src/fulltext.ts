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

import type { TxCreateDoc, Doc, Ref, Class, Obj, Hierarchy, AnyAttribute } from '@anticrm/core'
import { TxProcessor, IndexKind } from '@anticrm/core'
import type { IndexedContent, FullTextAdapter } from './types'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const NO_INDEX = {} as AnyAttribute

export class FullTextIndex extends TxProcessor {
  private readonly indexes = new Map<Ref<Class<Obj>>, AnyAttribute>()

  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly adapter: FullTextAdapter
  ) {
    super()
  }

  private findFullTextAttribute (clazz: Ref<Class<Obj>>): AnyAttribute | undefined {
    const attribute = this.indexes.get(clazz)
    if (attribute === undefined) {
      const attributes = this.hierarchy.getAllAttributes(clazz)
      for (const [, attr] of attributes) {
        if (attr.index === IndexKind.FullText) {
          this.indexes.set(clazz, attr)
          return attr
        }
      }
      this.indexes.set(clazz, NO_INDEX)
    } else if (attribute !== NO_INDEX) {
      return attribute
    }
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    const attribute = this.findFullTextAttribute(tx.objectClass)
    if (attribute === undefined) return
    const doc = TxProcessor.createDoc2Doc(tx)
    const content = (doc as any)[attribute.name]
    const indexedDoc: IndexedContent = {
      id: doc._id,
      _class: doc._class,
      modifiedBy: doc.modifiedBy,
      modifiedOn: doc.modifiedOn,
      space: doc.space,
      content
    }
    return await this.adapter.index(indexedDoc)
  }
}
