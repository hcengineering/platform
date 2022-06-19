//
// Copyright © 2022 Hardcore Engineering Inc.
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

// To help typescript locate view plugin properly
import automation, {
  Automation,
  AutomationSupport,
  AttributeAutomationSupport,
  AutomationSortSupport,
  AutomationTriggerSupport,
  Command,
  TriggerType
} from '@anticrm/automation'
import { Class, Doc, Ref } from '@anticrm/core'
import { Builder, Mixin, Model, UX } from '@anticrm/model'
import core, { TAttachedDoc, TClass } from '@anticrm/model-core'
import setting from '@anticrm/setting'

import plugin from './plugin'

@Model(automation.class.Automation, core.class.AttachedDoc)
@UX(automation.string.Automation)
export class TAutomation extends TAttachedDoc implements Automation<Doc> {
  name!: string
  description!: string | null
  targetClass!: Ref<Class<Doc>> | null
  declare trigger: {
    type: TriggerType
  }

  declare commands: Command<Doc>[]
}

@Mixin(automation.mixin.AutomationSupport, core.class.Class)
export class TAutomationSupport extends TClass implements AutomationSupport<Doc> {
  declare attributes: AttributeAutomationSupport<Doc>[]
  declare trigger: AutomationTriggerSupport<Doc>
  sort?: AutomationSortSupport<Doc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TAutomation, TAutomationSupport)
  builder.createDoc(core.class.Space, core.space.Model, {
    archived: false,
    description: 'Automation space',
    members: [],
    name: 'Automation space',
    private: true
  }, automation.space.Automation)
  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'automation',
      label: automation.string.Automation,
      icon: automation.icon.Automation, // TODO: update icon
      component: plugin.component.AutomationSettingsElement,
      order: 3600
    },
    plugin.ids.Automation
  )
}

export { automationOperation } from './migration'
