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
  type ActivityAttributeUpdatesPresenter,
  type ActivityInfoMessage,
  type ActivityDoc,
  type ActivityExtension,
  type ActivityExtensionKind,
  type ActivityMessage,
  type ActivityMessageExtension,
  type ActivityMessageExtensionKind,
  type ActivityMessagesFilter,
  type DocAttributeUpdates,
  type DocUpdateAction,
  type DocUpdateMessage,
  type DocUpdateMessageViewlet,
  type DocUpdateMessageViewletAttributesConfig,
  type Reaction,
  type TxViewlet,
  type ActivityMessageControl,
  type IgnoreActivity
} from '@hcengineering/activity'
import core, {
  DOMAIN_MODEL,
  type Class,
  type Doc,
  type DocumentQuery,
  type Ref,
  type Tx,
  IndexKind,
  type TxCUD,
  type Domain,
  type Account
} from '@hcengineering/core'
import {
  Model,
  type Builder,
  Prop,
  Index,
  TypeRef,
  TypeString,
  Mixin,
  Collection,
  TypeBoolean,
  TypeIntlString
} from '@hcengineering/model'
import { TAttachedDoc, TClass, TDoc } from '@hcengineering/model-core'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import view from '@hcengineering/model-view'

import activity from './plugin'

export { activityOperation } from './migration'
export { activityId } from '@hcengineering/activity'

export const DOMAIN_ACTIVITY = 'activity' as Domain

@Mixin(activity.mixin.ActivityDoc, core.class.Class)
export class TActivityDoc extends TClass implements ActivityDoc {
  preposition?: IntlString
}

@Mixin(activity.mixin.ActivityAttributeUpdatesPresenter, core.class.Class)
export class TActivityAttributeUpdatesPresenter extends TClass implements ActivityAttributeUpdatesPresenter {
  presenter!: AnyComponent
}

@Mixin(activity.mixin.IgnoreActivity, core.class.Class)
export class TIgnoreActivity extends TClass implements IgnoreActivity {}

@Model(activity.class.TxViewlet, core.class.Doc, DOMAIN_MODEL)
export class TTxViewlet extends TDoc implements TxViewlet {
  icon!: Asset
  objectClass!: Ref<Class<Doc>>
  txClass!: Ref<Class<Tx>>
  // Component to display on.
  component!: AnyComponent
  // Filter
  match?: DocumentQuery<Tx>
  label!: IntlString
  display!: 'inline' | 'content' | 'emphasized'
  editable!: boolean
  hideOnRemove!: boolean
}

@Model(activity.class.ActivityMessage, core.class.AttachedDoc, DOMAIN_ACTIVITY)
export class TActivityMessage extends TAttachedDoc implements ActivityMessage {
  @Prop(TypeBoolean(), activity.string.Pinned)
    isPinned?: boolean

  @Prop(Collection(activity.class.Reaction), activity.string.Reactions)
    reactions?: number
}

@Model(activity.class.DocUpdateMessage, activity.class.ActivityMessage)
export class TDocUpdateMessage extends TActivityMessage implements DocUpdateMessage {
  @Prop(TypeRef(core.class.Doc), core.string.Object)
  @Index(IndexKind.Indexed)
    objectId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.TxCUD), core.string.Object)
  @Index(IndexKind.Indexed)
    txId!: Ref<TxCUD<Doc>>

  action!: DocUpdateAction
  updateCollection?: string
  attributeUpdates?: DocAttributeUpdates
}

@Model(activity.class.ActivityInfoMessage, activity.class.ActivityMessage)
export class TActivityInfoMessage extends TActivityMessage implements ActivityInfoMessage {
  @Prop(TypeIntlString(), activity.string.Update)
    message!: IntlString

  props!: Record<string, any>
  icon!: Asset
  iconProps!: Record<string, any>
}

@Model(activity.class.ActivityMessageControl, core.class.Doc, DOMAIN_MODEL)
export class TActivityMessageControl extends TDoc implements ActivityMessageControl {
  objectClass!: Ref<Class<Doc>>

  // A set of rules to be skipped from generate doc update activity messages
  skip!: DocumentQuery<Tx>[]
}

@Model(activity.class.DocUpdateMessageViewlet, core.class.Doc, DOMAIN_MODEL)
export class TDocUpdateMessageViewlet extends TDoc implements DocUpdateMessageViewlet {
  @Prop(TypeRef(core.class.Doc), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeString(), core.string.String)
  @Index(IndexKind.Indexed)
    action!: DocUpdateAction

  label?: IntlString
  labelComponent?: AnyComponent

  valueAttr?: string

  icon?: Asset
  component?: AnyComponent
  config?: DocUpdateMessageViewletAttributesConfig
  hideIfRemoved?: boolean
  onlyWithParent?: boolean
}

@Model(activity.class.ActivityMessageExtension, core.class.Doc, DOMAIN_MODEL)
export class TActivityMessageExtension extends TDoc implements ActivityMessageExtension {
  @Prop(TypeRef(activity.class.ActivityMessage), core.string.Class)
  @Index(IndexKind.Indexed)
    ofMessage!: Ref<Class<ActivityMessage>>

  components!: { kind: ActivityMessageExtensionKind, component: AnyComponent }[]
}

@Model(activity.class.ActivityExtension, core.class.Doc, DOMAIN_MODEL)
export class TActivityExtension extends TDoc implements ActivityExtension {
  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
    ofClass!: Ref<Class<Doc>>

  components!: Record<ActivityExtensionKind, AnyComponent>
}

@Model(activity.class.ActivityMessagesFilter, core.class.Doc, DOMAIN_MODEL)
export class TActivityMessagesFilter extends TDoc implements ActivityMessagesFilter {
  label!: IntlString
  filter!: Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
}

@Model(activity.class.Reaction, core.class.AttachedDoc, DOMAIN_ACTIVITY)
export class TReaction extends TAttachedDoc implements Reaction {
  @Prop(TypeString(), activity.string.Emoji)
    emoji!: string

  @Prop(TypeRef(core.class.Account), view.string.Created)
    createBy!: Ref<Account>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TTxViewlet,
    TActivityDoc,
    TActivityMessagesFilter,
    TActivityMessageExtension,
    TActivityMessage,
    TDocUpdateMessage,
    TDocUpdateMessageViewlet,
    TActivityExtension,
    TReaction,
    TActivityAttributeUpdatesPresenter,
    TActivityInfoMessage,
    TActivityMessageControl,
    TIgnoreActivity
  )

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: activity.component.DocUpdateMessagePresenter
  })

  builder.mixin(activity.class.ActivityInfoMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: activity.component.ActivityInfoMessagePresenter
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: activity.string.Attributes,
    filter: activity.filter.AttributesFilter
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: activity.string.Pinned,
    filter: activity.filter.PinnedFilter
  })

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: activity.class.Reaction,
      action: 'create',
      component: activity.component.ReactionAddedMessage,
      label: activity.string.Reacted,
      onlyWithParent: true,
      hideIfRemoved: true
    },
    activity.ids.ReactionAddedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: activity.class.Reaction,
      action: 'remove',
      hideIfRemoved: true
    },
    activity.ids.ReactionRemovedActivityViewlet
  )
}

export default activity
