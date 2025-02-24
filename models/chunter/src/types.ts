//
// Copyright © 2024 Hardcore Engineering Inc.
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
  Collection as PropCollection,
  Index,
  Mixin,
  Model,
  Prop,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import core, { TClass, TDoc, TSpace } from '@hcengineering/model-core'
import type {
  Channel,
  ChatMessage,
  ChatMessageViewlet,
  ChatSyncInfo,
  ChunterSpace,
  DirectMessage,
  ObjectChatPanel,
  ThreadMessage
} from '@hcengineering/chunter'
import {
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MODEL,
  IndexKind,
  type Ref,
  type Timestamp
} from '@hcengineering/core'
import contact, { type ChannelProvider as SocialChannelProvider, type Person } from '@hcengineering/contact'
import activity, { type ActivityMessage } from '@hcengineering/activity'
import { TActivityMessage } from '@hcengineering/model-activity'
import attachment from '@hcengineering/model-attachment'
import type { IntlString } from '@hcengineering/platform'
import type { DocNotifyContext } from '@hcengineering/notification'

import chunter from './plugin'

export const DOMAIN_CHUNTER = 'chunter' as Domain

@Model(chunter.class.ChunterSpace, core.class.Space)
export class TChunterSpace extends TSpace implements ChunterSpace {
  @Prop(PropCollection(activity.class.ActivityMessage), chunter.string.Messages)
    messages?: number
}

@Model(chunter.class.Channel, chunter.class.ChunterSpace)
@UX(chunter.string.Channel, chunter.icon.Hashtag, undefined, undefined, undefined, chunter.string.Channels)
export class TChannel extends TChunterSpace implements Channel {
  @Prop(TypeString(), chunter.string.Topic)
  @Index(IndexKind.FullText)
    topic?: string
}

@Model(chunter.class.DirectMessage, chunter.class.ChunterSpace)
@UX(chunter.string.DirectMessage, contact.icon.Person, undefined, undefined, undefined, chunter.string.DirectMessages)
export class TDirectMessage extends TChunterSpace implements DirectMessage {}

@Model(chunter.class.ChatMessage, activity.class.ActivityMessage)
@UX(chunter.string.Message, chunter.icon.Thread, undefined, undefined, undefined, chunter.string.Threads)
export class TChatMessage extends TActivityMessage implements ChatMessage {
  @Prop(TypeMarkup(), chunter.string.Message)
  @Index(IndexKind.FullText)
    message!: string

  @Prop(PropCollection(attachment.class.Attachment), attachment.string.Attachments, {
    shortLabel: attachment.string.Files
  })
    attachments?: number

  @Prop(TypeRef(contact.class.ChannelProvider), core.string.Object)
    provider?: Ref<SocialChannelProvider>
}

@Model(chunter.class.ThreadMessage, chunter.class.ChatMessage)
@UX(chunter.string.ThreadMessage, chunter.icon.Thread, undefined, undefined, undefined, chunter.string.Threads)
export class TThreadMessage extends TChatMessage implements ThreadMessage {
  @Prop(TypeRef(activity.class.ActivityMessage), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<ActivityMessage>

  @Prop(TypeRef(activity.class.ActivityMessage), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  declare attachedToClass: Ref<Class<ActivityMessage>>

  @Prop(TypeRef(core.class.Doc), core.string.Object)
  @Index(IndexKind.Indexed)
    objectId!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>
}

@Model(chunter.class.ChatMessageViewlet, core.class.Doc, DOMAIN_MODEL)
export class TChatMessageViewlet extends TDoc implements ChatMessageViewlet {
  @Prop(TypeRef(core.class.Doc), core.string.Class)
  @Index(IndexKind.Indexed)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.Doc), core.string.Class)
  @Index(IndexKind.Indexed)
    messageClass!: Ref<Class<Doc>>

  label?: IntlString
  onlyWithParent?: boolean
}

@Mixin(chunter.mixin.ObjectChatPanel, core.class.Class)
export class TObjectChatPanel extends TClass implements ObjectChatPanel {
  openByDefault?: boolean
  ignoreKeys!: string[]
}

@Model(chunter.class.ChatSyncInfo, core.class.Doc, DOMAIN_CHUNTER)
export class TChatSyncInfo extends TDoc implements ChatSyncInfo {
  user!: Ref<Person>
  hidden!: Ref<DocNotifyContext>[]
  timestamp!: Timestamp
}
