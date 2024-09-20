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
  type ActivityDoc,
  type ActivityExtension,
  type ActivityExtensionKind,
  type ActivityInfoMessage,
  type ActivityMessage,
  type ActivityMessageControl,
  type ActivityMessagePreview,
  type ActivityMessagesFilter,
  type ActivityReference,
  type DocAttributeUpdates,
  type DocUpdateAction,
  type DocUpdateMessage,
  type DocUpdateMessageViewlet,
  type DocUpdateMessageViewletAttributesConfig,
  type IgnoreActivity,
  type Reaction,
  type SavedMessage,
  type ReplyProvider
} from '@hcengineering/activity'
import contact, { type Person } from '@hcengineering/contact'
import core, {
  DOMAIN_MODEL,
  IndexKind,
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type IndexingConfiguration,
  type Ref,
  type Timestamp,
  type Tx,
  type TxCUD
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  TypeBoolean,
  TypeIntlString,
  TypeMarkup,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX,
  type Builder
} from '@hcengineering/model'
import { TAttachedDoc, TClass, TDoc } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import view from '@hcengineering/model-view'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

import activity from './plugin'
import { buildActions } from './actions'
import { buildNotifications } from './notification'

export { activityId } from '@hcengineering/activity'
export { activityOperation, migrateMessagesSpace } from './migration'

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

@Model(activity.class.ActivityMessage, core.class.AttachedDoc, DOMAIN_ACTIVITY)
export class TActivityMessage extends TAttachedDoc implements ActivityMessage {
  @Prop(TypeBoolean(), activity.string.Pinned)
    isPinned?: boolean

  @Prop(ArrOf(TypeRef(contact.class.Person)), contact.string.Person)
    repliedPersons?: Ref<Person>[]

  @Prop(TypeTimestamp(), activity.string.LastReply)
  // @Index(IndexKind.Indexed)
    lastReply?: Timestamp

  @Prop(Collection(activity.class.Reaction), activity.string.Reactions)
    reactions?: number

  @Prop(Collection(activity.class.ActivityMessage), activity.string.Replies)
    replies?: number
}

@Model(activity.class.DocUpdateMessage, activity.class.ActivityMessage)
export class TDocUpdateMessage extends TActivityMessage implements DocUpdateMessage {
  @Prop(TypeRef(core.class.Doc), core.string.Object)
  @Index(IndexKind.Indexed)
    objectId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
  // @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.TxCUD), core.string.Object)
  // @Index(IndexKind.Indexed)
    txId?: Ref<TxCUD<Doc>>

  @Prop(TypeString(), core.string.Object)
  // @Index(IndexKind.Indexed)
    action!: DocUpdateAction

  updateCollection?: string
  attributeUpdates?: DocAttributeUpdates
}

@Model(activity.class.ActivityReference, activity.class.ActivityMessage)
export class TActivityReference extends TActivityMessage implements ActivityReference {
  // Source document we have reference from, it should be parent document for Comment/Message.
  @Prop(TypeRef(core.class.Doc), core.string.Object)
  // @Index(IndexKind.Indexed)
    srcDocId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
  // @Index(IndexKind.Indexed)
    srcDocClass!: Ref<Class<Doc>>

  // Reference to comment/message in source doc
  attachedDocId?: Ref<Doc>
  attachedDocClass?: Ref<Class<Doc>>

  @Prop(TypeMarkup(), activity.string.Message)
  @Index(IndexKind.FullText)
    message!: string

  @Prop(TypeTimestamp(), activity.string.Edit)
    editedOn?: Timestamp
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

  valueAttr?: string

  icon?: Asset
  component?: AnyComponent
  config?: DocUpdateMessageViewletAttributesConfig
  hideIfRemoved?: boolean
  onlyWithParent?: boolean
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
  position!: number
  filter!: Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
}

@Model(activity.class.Reaction, core.class.AttachedDoc, DOMAIN_ACTIVITY)
@UX(activity.string.Reactions)
export class TReaction extends TAttachedDoc implements Reaction {
  @Prop(TypeRef(activity.class.ActivityMessage), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<ActivityMessage>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  declare attachedToClass: Ref<Class<ActivityMessage>>

  @Prop(TypeString(), activity.string.Emoji)
    emoji!: string

  @Prop(TypeRef(core.class.Account), view.string.Created)
    createBy!: Ref<Account>
}

@Model(activity.class.SavedMessage, preference.class.Preference)
export class TSavedMessage extends TPreference implements SavedMessage {
  @Prop(TypeRef(activity.class.ActivityMessage), view.string.Save)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<ActivityMessage>
}

@Mixin(activity.mixin.ActivityMessagePreview, core.class.Class)
export class TActivityMessagePreview extends TClass implements ActivityMessagePreview {
  presenter!: AnyComponent
}

@Model(activity.class.ReplyProvider, core.class.Doc, DOMAIN_MODEL)
export class TReplyProvider extends TDoc implements ReplyProvider {
  function!: Resource<(message: ActivityMessage) => Promise<void>>
}

@Model(activity.class.UserMentionInfo, core.class.AttachedDoc, DOMAIN_ACTIVITY)
export class TUserMentionInfo extends TAttachedDoc {
  user!: Ref<Person>
  content!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TActivityDoc,
    TActivityMessagesFilter,
    TActivityMessage,
    TDocUpdateMessage,
    TDocUpdateMessageViewlet,
    TActivityExtension,
    TReaction,
    TActivityAttributeUpdatesPresenter,
    TActivityInfoMessage,
    TActivityMessageControl,
    TSavedMessage,
    TIgnoreActivity,
    TActivityReference,
    TActivityMessagePreview,
    TReplyProvider,
    TUserMentionInfo
  )

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: activity.component.DocUpdateMessagePresenter
  })

  builder.mixin(activity.class.ActivityInfoMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: activity.component.ActivityInfoMessagePresenter
  })

  builder.mixin(activity.class.ActivityReference, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: activity.component.ActivityReferencePresenter
  })

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: activity.component.DocUpdateMessagePreview
  })

  builder.mixin(activity.class.ActivityInfoMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: activity.component.ActivityInfoMessagePreview
  })

  builder.mixin(activity.class.ActivityReference, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: activity.component.ActivityReferencePreview
  })

  builder.createDoc(
    activity.class.ActivityMessagesFilter,
    core.space.Model,
    {
      label: activity.string.All,
      position: 10,
      filter: activity.filter.AllFilter
    },
    activity.ids.AllFilter
  )

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: activity.string.Attributes,
    position: 10,
    filter: activity.filter.AttributesFilter
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: activity.string.Pinned,
    position: 20,
    filter: activity.filter.PinnedFilter
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: activity.string.Mentions,
    position: 60,
    filter: activity.filter.ReferencesFilter
  })

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: activity.class.Reaction,
      action: 'create',
      component: activity.component.ReactionPresenter,
      label: activity.string.Reacted,
      onlyWithParent: true
    },
    activity.ids.ReactionAddedActivityViewlet
  )

  builder.mixin(activity.class.ActivityMessage, core.class.Class, view.mixin.ObjectPanel, {
    component: view.component.AttachedDocPanel
  })

  builder.mixin<Class<DocUpdateMessage>, IndexingConfiguration<DocUpdateMessage>>(
    activity.class.DocUpdateMessage,
    core.class.Class,
    core.mixin.IndexConfiguration,
    {
      searchDisabled: true,
      indexes: []
    }
  )

  builder.mixin<Class<DocUpdateMessage>, IndexingConfiguration<DocUpdateMessage>>(
    activity.class.Reaction,
    core.class.Class,
    core.mixin.IndexConfiguration,
    {
      searchDisabled: true,
      indexes: []
    }
  )

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_ACTIVITY,
    disabled: [
      { modifiedOn: 1 },
      { createdOn: -1 },
      { space: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 }
    ]
  })

  buildActions(builder)
  buildNotifications(builder)
}

export default activity
