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
  type Account,
  type AccountRole,
  type Arr,
  type Domain,
  DOMAIN_MODEL,
  IndexKind,
  type Ref,
  type Space,
  type TypedSpace,
  type SpaceType,
  type SpaceTypeDescriptor,
  type Role,
  type Class,
  type Permission,
  type CollectionSize
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Model,
  Prop,
  TypeBoolean,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import type { Asset, IntlString } from '@hcengineering/platform'
import core from './component'
import { TDoc, TAttachedDoc } from './core'

export const DOMAIN_SPACE = 'space' as Domain

// S P A C E

@Model(core.class.Space, core.class.Doc, DOMAIN_SPACE)
@UX(core.string.Space, undefined, undefined, 'name')
export class TSpace extends TDoc implements Space {
  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeBoolean(), core.string.Private)
    private!: boolean

  @Prop(TypeBoolean(), core.string.Archived)
    archived!: boolean

  @Prop(ArrOf(TypeRef(core.class.Account)), core.string.Members)
  @Hidden()
    members!: Arr<Ref<Account>>
}

@Model(core.class.TypedSpace, core.class.Space)
@UX(core.string.TypedSpace, undefined, undefined, 'name')
export class TTypedSpace extends TSpace implements TypedSpace {
  @Prop(TypeRef(core.class.SpaceType), core.string.SpaceType)
    type!: Ref<SpaceType>
}

@Model(core.class.SpaceTypeDescriptor, core.class.Doc, DOMAIN_MODEL)
export class TSpaceTypeDescriptor extends TDoc implements SpaceTypeDescriptor {
  name!: IntlString
  description!: IntlString
  icon!: Asset
  baseClass!: Ref<Class<Space>>
  availablePermissions!: Ref<Permission>[]
}

@Model(core.class.SpaceType, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.SpaceType, undefined, undefined, 'name')
export class TSpaceType extends TDoc implements SpaceType {
  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), core.string.ShortDescription)
    shortDescription?: string

  @Prop(TypeRef(core.class.SpaceTypeDescriptor), core.string.Descriptor)
    descriptor!: Ref<SpaceTypeDescriptor>

  @Prop(TypeRef(core.class.Class), core.string.TargetClass)
    targetClass!: Ref<Class<Space>>

  @Prop(Collection(core.class.Role), core.string.Roles)
    roles!: CollectionSize<Role>
}

@Model(core.class.Role, core.class.AttachedDoc, DOMAIN_MODEL)
@UX(core.string.Role, undefined, undefined, 'name')
export class TRole extends TAttachedDoc implements Role {
  @Prop(TypeRef(core.class.SpaceType), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedTo: Ref<SpaceType>

  @Prop(TypeRef(core.class.SpaceType), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<SpaceType>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'roles' = 'roles'

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(ArrOf(TypeRef(core.class.Permission)), core.string.Permission)
    permissions!: Ref<Permission>[]
}

@Model(core.class.Permission, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.Permission)
export class TPermission extends TDoc implements Permission {
  label!: IntlString
  description?: IntlString
  icon?: Asset
}

@Model(core.class.Account, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.Account)
export class TAccount extends TDoc implements Account {
  email!: string
  role!: AccountRole
}
