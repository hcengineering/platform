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

import { type Builder, Model, Prop, ReadOnly, TypeString, UX, TypeBoolean } from '@hcengineering/model'
import { type OnboardingChannel } from '@hcengineering/analytics-collector'
import chunter from '@hcengineering/chunter'
import { TChannel } from '@hcengineering/model-chunter'
import activity, { type ActivityMessageControl } from '@hcengineering/activity'
import core, { type PersonId, type WorkspaceUuid } from '@hcengineering/core'

import analyticsCollector from './plugin'

export { analyticsCollectorId } from '@hcengineering/analytics-collector'
export { analyticsCollectorOperation } from './migration'
export default analyticsCollector

@Model(analyticsCollector.class.OnboardingChannel, chunter.class.Channel)
@UX(
  analyticsCollector.string.OnboardingChannel,
  chunter.icon.Hashtag,
  undefined,
  undefined,
  undefined,
  analyticsCollector.string.OnboardingChannels
)
export class TOnboardingChannel extends TChannel implements OnboardingChannel {
  @Prop(TypeString(), analyticsCollector.string.UserName)
  @ReadOnly()
    userName!: string

  @Prop(TypeString(), analyticsCollector.string.SocialId)
  @ReadOnly()
    socialString!: PersonId

  @Prop(TypeString(), analyticsCollector.string.WorkspaceName)
  @ReadOnly()
    workspaceName!: string

  @Prop(TypeString(), analyticsCollector.string.WorkspaceUrl)
  @ReadOnly()
    workspaceUrl!: string

  @Prop(TypeString(), analyticsCollector.string.WorkspaceId)
  @ReadOnly()
    workspaceId!: WorkspaceUuid

  @Prop(TypeBoolean(), analyticsCollector.string.DisableAIReplies)
    disableAIReplies!: boolean

  @Prop(TypeBoolean(), analyticsCollector.string.ShowAIReplies)
    showAIReplies!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TOnboardingChannel)

  builder.mixin(analyticsCollector.class.OnboardingChannel, core.class.Class, chunter.mixin.ObjectChatPanel, {
    openByDefault: true,
    ignoreKeys: [
      'workspaceId',
      'archived',
      'collaborators',
      'lastMessage',
      'pinned',
      'topic',
      'description',
      'members',
      'owners',
      'autoJoin',
      'private'
    ]
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: analyticsCollector.class.OnboardingChannel,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc<ActivityMessageControl<OnboardingChannel>>(
    activity.class.ActivityMessageControl,
    core.space.Model,
    {
      objectClass: analyticsCollector.class.OnboardingChannel,
      skip: [
        { _class: core.class.TxMixin },
        { _class: core.class.TxCreateDoc, objectClass: { $ne: analyticsCollector.class.OnboardingChannel } },
        { _class: core.class.TxRemoveDoc }
      ],
      allowedFields: ['members']
    }
  )

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: analyticsCollector.class.OnboardingChannel,
    action: 'update',
    config: {
      members: {
        presenter: chunter.activity.MembersChangedMessage
      }
    }
  })
}
