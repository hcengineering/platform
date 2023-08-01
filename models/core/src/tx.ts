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

import {
  AttachedDoc,
  Class,
  Data,
  Doc,
  DocumentClassQuery,
  DocumentUpdate,
  DOMAIN_TX,
  IndexKind,
  Mixin,
  MixinUpdate,
  Ref,
  Space,
  Tx,
  TxApplyIf,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxRemoveDoc,
  TxUpdateDoc,
  TxWorkspaceEvent,
  WorkspaceEvent
} from '@hcengineering/core'
import { Hidden, Index, Model, Prop, TypeRef } from '@hcengineering/model'
import core from './component'
import { TDoc } from './core'

// T R A N S A C T I O N S

@Model(core.class.Tx, core.class.Doc, DOMAIN_TX)
export class TTx extends TDoc implements Tx {
  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
    objectSpace!: Ref<Space>
}

@Model(core.class.TxModelUpgrade, core.class.Tx, DOMAIN_TX)
export class TTxModelUpgrade extends TTx {}

@Model(core.class.TxCUD, core.class.Tx)
export class TTxCUD<T extends Doc> extends TTx implements TxCUD<T> {
  @Prop(TypeRef(core.class.Doc), core.string.Object)
  @Index(IndexKind.Indexed)
  @Hidden()
    objectId!: Ref<T>

  @Prop(TypeRef(core.class.Class), core.string.ClassLabel)
  @Index(IndexKind.Indexed)
  @Hidden()
    objectClass!: Ref<Class<T>>
}

@Model(core.class.TxCreateDoc, core.class.TxCUD)
export class TTxCreateDoc<T extends Doc> extends TTxCUD<T> implements TxCreateDoc<T> {
  attributes!: Data<T>
}

@Model(core.class.TxCollectionCUD, core.class.TxCUD)
export class TTxCollectionCUD<T extends Doc, P extends AttachedDoc> extends TTxCUD<T> implements TxCollectionCUD<T, P> {
  collection!: string
  tx!: TxCUD<P>
}

@Model(core.class.TxMixin, core.class.TxCUD)
export class TTxMixin<D extends Doc, M extends D> extends TTxCUD<D> implements TxMixin<D, M> {
  mixin!: Ref<Mixin<M>>
  attributes!: MixinUpdate<D, M>
}

@Model(core.class.TxUpdateDoc, core.class.TxCUD)
export class TTxUpdateDoc<T extends Doc> extends TTxCUD<T> implements TxUpdateDoc<T> {
  operations!: DocumentUpdate<T>
}

@Model(core.class.TxRemoveDoc, core.class.TxCUD)
export class TTxRemoveDoc<T extends Doc> extends TTxCUD<T> implements TxRemoveDoc<T> {}

@Model(core.class.TxApplyIf, core.class.Tx)
export class TTxApplyIf extends TTx implements TxApplyIf {
  scope!: string

  // All matches should be true with at least one document.
  match!: DocumentClassQuery<Doc>[]
  // All matches should be false for all documents.
  notMatch!: DocumentClassQuery<Doc>[]
  txes!: TxCUD<Doc>[]
}

@Model(core.class.TxWorkspaceEvent, core.class.Doc)
export class TTxWorkspaceEvent extends TTx implements TxWorkspaceEvent {
  event!: WorkspaceEvent
  params!: any
}
