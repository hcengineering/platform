// Copyright © 2025 Hardcore Engineering Inc.
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

import {
  AttachedDoc,
  Blobs,
  Class,
  CollectionSize,
  Data,
  Doc,
  Domain,
  MarkupBlobRef,
  Mixin,
  Rank,
  Ref,
  Space
} from '@hcengineering/core'
import { Asset, IntlString, plugin, Plugin, Resource } from '@hcengineering/platform'
import type { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import { Preference } from '@hcengineering/preference'
import { IconProps } from '@hcengineering/view'

export * from './analytics'

export interface MasterTag extends Class<Card> {
  color?: number // used for emoji icon
  background?: number
  removed?: boolean
  roles?: CollectionSize<Role>
}

export interface Tag extends MasterTag, Mixin<Card> {}

export interface Role extends AttachedDoc<MasterTag | Tag, 'roles'> {
  name: string
  attachedTo: Ref<MasterTag | Tag>
}

export interface Card extends Doc, IconProps {
  _class: Ref<MasterTag>
  title: string
  content: MarkupBlobRef
  blobs: Blobs
  children?: number
  attachments?: number
  parentInfo: ParentInfo[]
  parent?: Ref<Card> | null
  rank: Rank
  readonly?: boolean
}

export interface CardSpace extends Space {
  types: Ref<MasterTag>[]
}

export interface ParentInfo {
  _id: Ref<Card>
  _class: Ref<MasterTag>
  title: string
}

export interface MasterTagEditorSection extends Doc {
  id: string
  label: IntlString
  component: AnyComponent
  masterOnly?: boolean
}

export interface CardNavigation {
  id: string
  label: IntlString
}

export interface CardSection extends Doc {
  label: IntlString
  component: AnyComponent
  order: number
  navigation: CardNavigation[]
  checkVisibility?: Resource<(doc: Card) => Promise<boolean>>
}

export interface CardViewDefaults extends MasterTag {
  defaultSection: Ref<CardSection>
  defaultNavigation?: string
}

export interface FavoriteCard extends Preference {
  attachedTo: Ref<Card>
  application: string
}

export interface CreateCardExtension extends MasterTag {
  component?: AnyComponent
  canCreate?: CanCreateCardResource
  disableTitle?: boolean
  hideSpace?: boolean
}

export type CanCreateCardFn = (space: Ref<Space>, data: Partial<Data<Card>>) => Promise<boolean | Ref<Card>>
export type CanCreateCardResource = Resource<CanCreateCardFn>

/**
 * @public
 */
export const cardId = 'card' as Plugin

export const DOMAIN_CARD = 'card' as Domain

/**
 * @public
 */
const cardPlugin = plugin(cardId, {
  class: {
    Card: '' as Ref<Class<Card>>,
    MasterTag: '' as Ref<Class<MasterTag>>,
    Tag: '' as Ref<Class<Tag>>,
    MasterTagEditorSection: '' as Ref<Class<MasterTagEditorSection>>,
    CardSpace: '' as Ref<Class<CardSpace>>,
    Role: '' as Ref<Class<Role>>,
    CardSection: '' as Ref<Class<CardSection>>,
    FavoriteCard: '' as Ref<Class<FavoriteCard>>
  },
  mixin: {
    CardViewDefaults: '' as Ref<Mixin<CardViewDefaults>>,
    CreateCardExtension: '' as Ref<Mixin<CreateCardExtension>>
  },
  space: {
    Default: '' as Ref<CardSpace>
  },
  types: {
    File: '' as Ref<MasterTag>,
    Document: '' as Ref<MasterTag>
  },
  icon: {
    MasterTags: '' as Asset,
    MasterTag: '' as Asset,
    Tag: '' as Asset,
    Tags: '' as Asset,
    Card: '' as Asset,
    File: '' as Asset,
    View: '' as Asset,
    Document: '' as Asset,
    Home: '' as Asset,
    Space: '' as Asset,
    Expand: '' as Asset,
    Feed: '' as Asset
  },
  extensions: {
    EditCardExtension: '' as ComponentExtensionId
  },
  string: {
    MasterTag: '' as IntlString,
    MasterTags: '' as IntlString,
    Tags: '' as IntlString,
    Tag: '' as IntlString,
    Card: '' as IntlString,
    Cards: '' as IntlString,
    CardApplication: '' as IntlString,
    Views: '' as IntlString,
    Labels: '' as IntlString,
    GetIndividualPublicLink: '' as IntlString,
    AddTag: '' as IntlString,
    Feed: '' as IntlString
  },
  section: {
    Attachments: '' as Ref<CardSection>,
    Children: '' as Ref<CardSection>,
    Content: '' as Ref<CardSection>,
    Properties: '' as Ref<CardSection>,
    Relations: '' as Ref<CardSection>
  },
  ids: {
    CardWidget: '' as Ref<Doc>
  },
  component: {
    LabelsPresenter: '' as AnyComponent,
    CardTagColored: '' as AnyComponent,
    CardTagsColored: '' as AnyComponent,
    CardIcon: '' as AnyComponent,
    CardArrayEditor: '' as AnyComponent,
    CardFeedView: '' as AnyComponent
  },
  function: {
    OpenCardInSidebar: '' as Resource<(_id: Ref<Card>, card?: Card) => Promise<void>>,
    GetSpaceAccessPublicLink: '' as Resource<(doc?: Doc | Doc[]) => Promise<string>>,
    CanGetSpaceAccessPublicLink: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>
  },
  label: {
    Subscribed: '' as Ref<Doc>,
    NewMessages: '' as Ref<Doc>
  }
})

export default cardPlugin
