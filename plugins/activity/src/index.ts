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

import { Person } from '@hcengineering/contact'
import {
  PersonId,
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  Mixin,
  Ref,
  type RelatedDocument,
  Timestamp,
  Tx,
  TxCUD
} from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import type { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import type { Action } from '@hcengineering/view'

/**
 * @public
 */
export interface ActivityMessage extends AttachedDoc {
  modifiedBy: PersonId
  modifiedOn: Timestamp

  isPinned?: boolean

  repliedPersons?: Ref<Person>[]
  lastReply?: Timestamp

  replies?: number
  reactions?: number
  editedOn?: Timestamp
}

export type DisplayActivityMessage = DisplayDocUpdateMessage | ActivityMessage

export interface DisplayDocUpdateMessage extends DocUpdateMessage {
  previousMessages?: DocUpdateMessage[]
  combinedMessagesIds?: Ref<DocUpdateMessage>[]
}

/**
 * Designed to control and filter some of changes from being to be propagated into activity.
 * @public
 */
export interface ActivityMessageControl<T extends Doc = Doc> extends Doc {
  objectClass: Ref<Class<Doc>>

  // A set of rules to be skipped from generate doc update activity messages
  skip: DocumentQuery<Tx>[]

  // Skip field activity operations.
  skipFields?: (keyof T)[]
  allowedFields?: (keyof T)[]
}

/**
 *
 * General information activity message.
 * @public
 */
export interface ActivityInfoMessage extends ActivityMessage {
  title?: IntlString
  message: IntlString
  props?: Record<string, any>
  icon?: Asset
  iconProps?: Record<string, any>
  editedOn?: Timestamp

  // A possible set of links to some platform resources.
  links?: { _class: Ref<Class<Doc>>, _id: Ref<Doc> }[]
}

/**
 * @public
 */
export interface DocUpdateMessage extends ActivityMessage {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>

  txId?: Ref<TxCUD<Doc>>

  action: DocUpdateAction
  updateCollection?: string
  attributeUpdates?: DocAttributeUpdates
}

export interface ActivityReference extends ActivityMessage {
  // A mentioned document
  // attachedTo: Ref<Doc>
  // attachedToClass: Ref<Class<Doc>>

  // Source document we have reference from, it should be parent document for Comment/Message.
  srcDocId: Ref<Doc>
  srcDocClass: Ref<Class<Doc>>

  // Reference to comment/message in source doc
  attachedDocId?: Ref<Doc>
  attachedDocClass?: Ref<Class<Doc>>

  message: string
}

/**
 * @public
 */
export interface DocAttributeUpdates {
  attrKey: string
  attrClass: Ref<Class<Doc>>
  set: (string | number | null)[]
  prevValue?: any // Need for description diff
  added: (string | number | null)[]
  removed: (string | number | null)[]
  isMixin: boolean
}

export type DocUpdateAction = 'create' | 'update' | 'remove'

export type DocUpdateMessageViewletAttributesConfig = Record<
string,
{
  presenter?: AnyComponent
  icon?: Asset
  iconPresenter?: AnyComponent
}
>

/**
 * @public
 */
export interface ActivityMessageViewlet extends Doc {
  objectClass: Ref<Class<Doc>>
  onlyWithParent?: boolean
}

/**
 * @public
 */
export interface DocUpdateMessageViewlet extends ActivityMessageViewlet {
  action: DocUpdateAction
  valueAttr?: string

  label?: IntlString

  icon?: Asset
  component?: AnyComponent

  config?: DocUpdateMessageViewletAttributesConfig

  hideIfRemoved?: boolean
}

/**
 * @public
 */
export const activityId = 'activity' as Plugin

/**
 * @public
 */
export interface ActivityMessagesFilter extends Doc {
  label: IntlString
  position: number
  filter: Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
}

/**
 * @public
 */
export interface ActivityDoc extends Class<Doc> {
  preposition?: IntlString
}

/**
 * @public
 */
export interface ActivityAttributeUpdatesPresenter extends Class<Doc> {
  presenter: AnyComponent
}

export interface ActivityMessagePreview extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export type ActivityExtensionKind = 'input'

/**
 * @public
 */
export interface ActivityExtension extends Doc {
  ofClass: Ref<Class<Doc>>
  components: Record<ActivityExtensionKind, { component: AnyComponent, props?: Record<string, any> }>
}

/**
 * @public
 */
export interface Reaction extends AttachedDoc {
  attachedTo: Ref<ActivityMessage>
  attachedToClass: Ref<Class<ActivityMessage>>
  emoji: string
  createBy: PersonId
}

/**
 * @public
 */
export interface SavedMessage extends Preference {
  attachedTo: Ref<ActivityMessage>
}

export interface ReplyProvider extends Doc {
  function: Resource<(message: ActivityMessage, event: MouseEvent) => Promise<void>>
}

export interface UserMentionInfo extends AttachedDoc {
  user: Ref<Person>
  content: string
}

export type WithReferences<T extends Doc> = T & {
  references?: number
}

/**
 * @public
 */
export interface IgnoreActivity extends Class<Doc> {}

export type ActivityMessagePreviewType = 'full' | 'content-only'
export type ActivityMessageViewType = 'default' | 'short'

export default plugin(activityId, {
  mixin: {
    ActivityDoc: '' as Ref<Mixin<ActivityDoc>>,
    ActivityAttributeUpdatesPresenter: '' as Ref<Mixin<ActivityAttributeUpdatesPresenter>>,
    ActivityMessagePreview: '' as Ref<Mixin<ActivityMessagePreview>>,
    IgnoreActivity: '' as Ref<Mixin<IgnoreActivity>>
  },
  class: {
    DocUpdateMessage: '' as Ref<Class<DocUpdateMessage>>,
    ActivityMessage: '' as Ref<Class<ActivityMessage>>,
    ActivityInfoMessage: '' as Ref<Class<ActivityInfoMessage>>,
    ActivityMessageControl: '' as Ref<Class<ActivityMessageControl>>,
    DocUpdateMessageViewlet: '' as Ref<Class<DocUpdateMessageViewlet>>,
    ActivityMessagesFilter: '' as Ref<Class<ActivityMessagesFilter>>,
    ActivityExtension: '' as Ref<Class<ActivityExtension>>,
    Reaction: '' as Ref<Class<Reaction>>,
    SavedMessage: '' as Ref<Class<SavedMessage>>,
    ActivityReference: '' as Ref<Class<ActivityReference>>,
    ReplyProvider: '' as Ref<Class<ReplyProvider>>,
    UserMentionInfo: '' as Ref<Class<UserMentionInfo>>
  },
  icon: {
    Activity: '' as Asset,
    Emoji: '' as Asset,
    Bookmark: '' as Asset,
    BookmarkFilled: '' as Asset
  },
  string: {
    Activity: '' as IntlString,
    Added: '' as IntlString,
    Changed: '' as IntlString,
    Edited: '' as IntlString,
    From: '' as IntlString,
    Removed: '' as IntlString,
    To: '' as IntlString,
    Unset: '' as IntlString,
    In: '' as IntlString,
    At: '' as IntlString,
    NewestFirst: '' as IntlString,
    Edit: '' as IntlString,
    Updated: '' as IntlString,
    Created: '' as IntlString,
    UpdatedCollection: '' as IntlString,
    New: '' as IntlString,
    Set: '' as IntlString,
    Update: '' as IntlString,
    For: '' as IntlString,
    AllActivity: '' as IntlString,
    Reaction: '' as IntlString,
    Reactions: '' as IntlString,
    LastReply: '' as IntlString,
    RepliesCount: '' as IntlString,
    Reacted: '' as IntlString,
    Message: '' as IntlString,
    Mentioned: '' as IntlString,
    You: '' as IntlString,
    Mentions: '' as IntlString,
    MentionedYouIn: '' as IntlString,
    Messages: '' as IntlString,
    Thread: '' as IntlString,
    ReactionNotificationTitle: '' as IntlString,
    ReactionNotificationBody: '' as IntlString,
    NewObject: '' as IntlString,
    RemovedObject: '' as IntlString,
    ChangedObject: '' as IntlString,
    UnsetObject: '' as IntlString,
    UpdatedObject: '' as IntlString
  },
  component: {
    Activity: '' as AnyComponent,
    ActivityMessagePresenter: '' as AnyComponent,
    DocUpdateMessagePresenter: '' as AnyComponent,
    ActivityInfoMessagePresenter: '' as AnyComponent,
    ReactionPresenter: '' as AnyComponent,
    ActivityMessageNotificationLabel: '' as AnyComponent,
    ActivityReferencePresenter: '' as AnyComponent,
    DocUpdateMessagePreview: '' as AnyComponent,
    ActivityReferencePreview: '' as AnyComponent,
    ActivityInfoMessagePreview: '' as AnyComponent
  },
  ids: {
    AllFilter: '' as Ref<ActivityMessagesFilter>,
    MentionNotification: '' as Ref<Doc>
  },
  extension: {
    ActivityEmployeePresenter: '' as ComponentExtensionId
  },
  function: {
    ShouldScrollToActivity: '' as Resource<() => boolean>
  },
  backreference: {
    // Update list of back references
    Update: '' as Resource<(source: Doc, key: string, target: RelatedDocument[], label: IntlString) => Promise<void>>
  },
  action: {
    Reply: '' as Ref<Action>
  }
})
