//
// Copyright © 2026 TraceX SAS.
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
  ClassifierKind,
  DOMAIN_TRANSIENT,
  Hierarchy,
  MeasureMetricsContext,
  TxFactory,
  TxProcessor,
  type Class,
  type Data,
  type Doc,
  type Mixin,
  type Obj,
  type Ref,
  type Space,
  type Timestamp,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import type { DbAdapter } from '../../adapter'
import { createInMemoryAdapter } from '../../mem'

interface DocumentOptions<T extends Doc> {
  id?: Ref<T>
  space?: Ref<Space>
  modifiedOn?: Timestamp
}

export interface InMemoryFixture {
  adapter: DbAdapter
  ctx: MeasureMetricsContext
  hierarchy: Hierarchy
  factory: TxFactory
  workspace: WorkspaceIds
  createClass: <T extends Doc>(name: string, attributes?: Partial<Data<Class<Obj>>>) => Ref<Class<T>>
  createMixin: <D extends Doc, M extends D>(name: string, parent: Ref<Class<D>>) => Ref<Mixin<M>>
  createStringAttribute: (attributeOf: Ref<Class<Doc>>, name: string) => void
  setBroadcastOnly: (objectClass: Ref<Class<Doc>>, broadcastOnly: boolean) => void
  createDoc: <T extends Doc>(
    objectClass: Ref<Class<T>>,
    attributes: Data<T>,
    options?: DocumentOptions<T>
  ) => Promise<T>
}

/** Creates an empty adapter with helpers for explicit scenario setup. */
export async function createInMemoryFixture (): Promise<InMemoryFixture> {
  const ctx = new MeasureMetricsContext('test', {})
  const hierarchy = new Hierarchy()
  const factory = new TxFactory(core.account.System)
  const workspace: WorkspaceIds = { uuid: 'test-workspace' as WorkspaceUuid, url: 'test' }

  function registerClass (id: Ref<Class<Obj>>, attributes: Partial<Data<Class<Obj>>>): void {
    hierarchy.tx(
      factory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        {
          kind: ClassifierKind.CLASS,
          label: 'test:string:Class' as IntlString,
          ...attributes
        },
        id
      )
    )
  }

  registerClass(core.class.Obj, {})
  registerClass(core.class.Doc, { extends: core.class.Obj })
  registerClass(core.class.Class, { extends: core.class.Doc })
  registerClass(core.class.Mixin, { extends: core.class.Class })

  const adapter = await createInMemoryAdapter(ctx, hierarchy, '', workspace)

  function createClass<T extends Doc> (name: string, attributes: Partial<Data<Class<Obj>>> = {}): Ref<Class<T>> {
    const id = `test:class:${name}` as Ref<Class<T>>
    registerClass(id, { extends: core.class.Doc, domain: DOMAIN_TRANSIENT, ...attributes })
    return id
  }

  function createMixin<D extends Doc, M extends D> (name: string, parent: Ref<Class<D>>): Ref<Mixin<M>> {
    const id = `test:mixin:${name}` as Ref<Mixin<M>>
    hierarchy.tx(
      factory.createTxCreateDoc(
        core.class.Mixin,
        core.space.Model,
        {
          kind: ClassifierKind.MIXIN,
          label: 'test:string:Mixin' as IntlString,
          extends: parent
        },
        id
      )
    )
    return id
  }

  function createStringAttribute (attributeOf: Ref<Class<Doc>>, name: string): void {
    hierarchy.tx(
      factory.createTxCreateDoc(core.class.Attribute, core.space.Model, {
        name,
        label: 'test:string:Attribute' as IntlString,
        attributeOf,
        type: { _class: core.class.TypeString }
      })
    )
  }

  function setBroadcastOnly (objectClass: Ref<Class<Doc>>, broadcastOnly: boolean): void {
    if (hierarchy.findClass(core.mixin.TransientConfiguration) === undefined) {
      hierarchy.tx(
        factory.createTxCreateDoc(
          core.class.Mixin,
          core.space.Model,
          {
            kind: ClassifierKind.MIXIN,
            label: 'test:string:Configuration' as IntlString,
            extends: core.class.Class
          },
          core.mixin.TransientConfiguration
        )
      )
    }
    hierarchy.tx(
      factory.createTxMixin(objectClass, core.class.Class, core.space.Model, core.mixin.TransientConfiguration, {
        broadcastOnly
      })
    )
  }

  async function createDoc<T extends Doc> (
    objectClass: Ref<Class<T>>,
    attributes: Data<T>,
    options: DocumentOptions<T> = {}
  ): Promise<T> {
    const tx = factory.createTxCreateDoc(
      objectClass,
      options.space ?? core.space.Space,
      attributes,
      options.id,
      options.modifiedOn
    )
    await adapter.tx(ctx, tx)
    return TxProcessor.createDoc2Doc(tx)
  }

  return {
    adapter,
    ctx,
    hierarchy,
    factory,
    workspace,
    createClass,
    createMixin,
    createStringAttribute,
    setBroadcastOnly,
    createDoc
  }
}
