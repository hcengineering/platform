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

import type { IntlString } from '@anticrm/platform'
import type {
  Account,
  AnyAttribute,
  AttachedDoc,
  Class,
  ClassifierKind,
  Doc,
  Domain,
  Mixin,
  Obj,
  Ref,
  Space,
  Timestamp,
  Type,
  Collection,
  RefTo,
  ArrOf,
  Interface
} from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Model, Prop, TypeRef, TypeString, TypeTimestamp } from '@anticrm/model'
import core from './component'

// C O R E
@Model(core.class.Obj, core.class.Obj)
export class TObj implements Obj {
  @Prop(TypeRef(core.class.Class), 'Class' as IntlString)
  _class!: Ref<Class<this>>
}

@Model(core.class.Doc, core.class.Obj)
export class TDoc extends TObj implements Doc {
  @Prop(TypeRef(core.class.Doc), 'Id' as IntlString)
  _id!: Ref<this>

  @Prop(TypeRef(core.class.Space), 'Space' as IntlString)
  space!: Ref<Space>

  @Prop(TypeTimestamp(), 'Modified' as IntlString)
  modifiedOn!: Timestamp

  @Prop(TypeRef(core.class.Account), 'Modified By' as IntlString)
  modifiedBy!: Ref<Account>
}

@Model(core.class.AttachedDoc, core.class.Doc)
export class TAttachedDoc extends TDoc implements AttachedDoc {
  @Prop(TypeRef(core.class.Doc), 'Attached to' as IntlString)
  attachedTo!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), 'Attached to class' as IntlString)
  attachedToClass!: Ref<Class<Doc>>

  @Prop(TypeString(), 'Collection' as IntlString)
  collection!: string
}

@Model(core.class.Class, core.class.Doc, DOMAIN_MODEL)
export class TClass extends TDoc implements Class<Obj> {
  kind!: ClassifierKind
  label!: IntlString
  extends!: Ref<Class<Obj>>
  domain!: Domain
}

@Model(core.class.Mixin, core.class.Class)
export class TMixin extends TClass implements Mixin<Doc> {}

@Model(core.class.Interface, core.class.Class)
export class TInterface extends TDoc implements Interface<Doc> {
  kind!: ClassifierKind
  label!: IntlString
  extends?: Ref<Interface<Doc>>[]
}

@Model(core.class.Attribute, core.class.Doc, DOMAIN_MODEL)
export class TAttribute extends TDoc implements AnyAttribute {
  attributeOf!: Ref<Class<Obj>>
  name!: string
  type!: Type<any>
  label!: IntlString
}

@Model(core.class.Type, core.class.Obj)
export class TType extends TObj implements Type<any> {
  label!: IntlString
}

@Model(core.class.TypeString, core.class.Type)
export class TTypeString extends TType {}

@Model(core.class.RefTo, core.class.Type)
export class TRefTo extends TType implements RefTo<Doc> {
  to!: Ref<Class<Doc>>
}

@Model(core.class.Collection, core.class.Type)
export class TCollection extends TType implements Collection<AttachedDoc> {
  of!: Ref<Class<Doc>>
}

@Model(core.class.ArrOf, core.class.Type)
export class TArrOf extends TType implements ArrOf<Doc> {
  of!: Type<Doc>
}

@Model(core.class.TypeBoolean, core.class.Type)
export class TTypeBoolean extends TType {}

@Model(core.class.TypeTimestamp, core.class.Type)
export class TTypeTimestamp extends TType {}

@Model(core.class.TypeDate, core.class.Type)
export class TTypeDate extends TType {}
