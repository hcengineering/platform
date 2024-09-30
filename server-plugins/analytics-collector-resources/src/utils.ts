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
import chunter, { Channel } from '@hcengineering/chunter'
import core, { MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import contact, { Person } from '@hcengineering/contact'
import analyticsCollector, { getOnboardingChannelName, OnboardingChannel } from '@hcengineering/analytics-collector'
import { translate } from '@hcengineering/platform'

interface WorkspaceInfo {
  workspaceId: string
  workspaceName: string
  workspaceUrl: string
}

export async function getOrCreateOnboardingChannel (
  ctx: MeasureContext,
  client: TxOperations,
  email: string,
  workspace: WorkspaceInfo,
  person?: Person
): Promise<[Ref<OnboardingChannel> | undefined, boolean]> {
  const channel = await client.findOne(analyticsCollector.class.OnboardingChannel, {
    workspaceId: workspace.workspaceId,
    email
  })

  if (channel !== undefined) {
    return [channel._id, false]
  }

  ctx.info('Creating user onboarding channel', { email, workspace })

  const _id = await client.createDoc(analyticsCollector.class.OnboardingChannel, core.space.Space, {
    name: getOnboardingChannelName(workspace.workspaceUrl, email),
    topic: await translate(analyticsCollector.string.OnboardingChannelDescription, {
      user: person?.name ?? email,
      workspace: workspace.workspaceName
    }),
    description: '',
    private: false,
    members: [],
    autoJoin: false,
    archived: false,
    email,
    workspaceId: workspace.workspaceId,
    workspaceUrl: workspace.workspaceUrl,
    workspaceName: workspace.workspaceName,
    userName: person?.name ?? email,
    disableAIReplies: false,
    showAIReplies: true
  })

  return [_id, true]
}

export async function createGeneralOnboardingChannel (
  ctx: MeasureContext,
  client: TxOperations
): Promise<Channel | undefined> {
  const channel = await client.findOne(chunter.class.Channel, {
    _id: analyticsCollector.space.GeneralOnboardingChannel
  })

  if (channel !== undefined) {
    return channel
  }

  ctx.info('Creating general onboarding channel')

  const accounts = await client.findAll(contact.class.PersonAccount, {})
  await client.createDoc(
    chunter.class.Channel,
    core.space.Space,
    {
      name: 'General Onboarding',
      topic: '',
      description: '',
      private: false,
      members: accounts.map(({ _id }) => _id),
      autoJoin: true,
      archived: false
    },
    analyticsCollector.space.GeneralOnboardingChannel
  )

  return await client.findOne(chunter.class.Channel, { _id: analyticsCollector.space.GeneralOnboardingChannel })
}
