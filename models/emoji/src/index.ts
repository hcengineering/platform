//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'

import presentation from '@hcengineering/model-presentation'
import workbench from '@hcengineering/model-workbench'
import setting from '@hcengineering/setting'
import view from '@hcengineering/view'
import print from '@hcengineering/model-print'
import tracker from '@hcengineering/model-tracker'

import { DOMAIN_EMOJI, TCustomEmoji } from './models'
import emojiPlugin from './plugin'
import { AccountRole } from '@hcengineering/core'

export { emojiId } from '@hcengineering/emoji'
export { emojiPlugin as default }

export function createModel (builder: Builder): void {
  builder.createModel(TCustomEmoji)

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_EMOJI,
    disabled: [{ space: 1 }, { modifiedOn: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })

  builder.createDoc(setting.class.WorkspaceSettingCategory, core.space.Model, {
    name: 'emojis',
    label: emojiPlugin.string.CustomEmojis,
    icon: emojiPlugin.icon.Emoji,
    component: emojiPlugin.component.SettingsEmojiTable,
    group: 'settings-editor',
    role: AccountRole.User,
    order: 5000
  })

  builder.mixin(emojiPlugin.class.CustomEmoji, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, view.action.OpenInNewTab, print.action.Print, tracker.action.NewRelatedIssue]
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchExtensions,
    component: emojiPlugin.component.WorkbenchExtension
  })
}
