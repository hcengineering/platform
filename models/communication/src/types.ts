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

import { type Builder, Model } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import { DOMAIN_MODEL } from '@hcengineering/core'
import { type Asset, type IntlString } from '@hcengineering/platform'
import communication, {
  type MessageAction,
  type MessageActionFunctionResource,
  type MessageActionVisibilityTesterResource
} from '@hcengineering/communication'

@Model(communication.class.MessageAction, core.class.Doc, DOMAIN_MODEL)
class TMessageAction extends TDoc implements MessageAction {
  label!: IntlString
  icon!: Asset
  action!: MessageActionFunctionResource
  order!: number

  visibilityTester?: MessageActionVisibilityTesterResource
  menu?: boolean
}

export function buildTypes (builder: Builder): void {
  builder.createModel(TMessageAction)
}
