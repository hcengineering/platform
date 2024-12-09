//
// Copyright © 2023 Hardcore Engineering Inc.
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
  type Attribute,
  DOMAIN_MODEL,
  DOMAIN_STATUS,
  type Ref,
  type Status,
  type StatusCategory,
  type Doc,
  type Class,
  type Rank
} from '@hcengineering/core'
import { Model, Prop, TypeRef, TypeString, UX } from '@hcengineering/model'
import { type Asset, type IntlString } from '@hcengineering/platform'
import core from './component'
import { TDoc } from './core'

// S T A T U S

// Note: domain is removed if there's no model for that domain
// We want to keep status domain for the migration period to make sure we don't lose
// any data. After the migration period, we can remove this model along with the domain.
@Model('domain:status:placeholder' as Ref<Class<Doc>>, core.class.Doc, DOMAIN_STATUS)
export class TDomainStatusPlaceholder extends TDoc {}

@Model(core.class.Status, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.Status, undefined, undefined, undefined, 'name')
export class TStatus extends TDoc implements Status {
  // We attach to attribute, so we could distinguish between
  ofAttribute!: Ref<Attribute<Status>>

  @Prop(TypeRef(core.class.StatusCategory), core.string.StatusCategory)
    category?: Ref<StatusCategory>

  @Prop(TypeString(), core.string.Name)
    name!: string

  // @Prop(TypeNumber(), core.string.Color)
  color!: number

  @Prop(TypeString(), core.string.Description)
    description!: string

  rank!: Rank
}

@Model(core.class.StatusCategory, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.StatusCategory)
export class TStatusCategory extends TDoc implements StatusCategory {
  // We attach to attribute, so we could distinguish between
  ofAttribute!: Ref<Attribute<Status>>
  icon!: Asset
  label!: IntlString
  color!: number
  defaultStatusName!: string
  order!: number
}
