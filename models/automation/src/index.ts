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
  AttributeAutomationSupport,
  Automation,
  AutomationSortSupport,
  AutomationSupport,
  AutomationTriggerSupport,
  Command,
  TriggerType
} from '@hcengineering/automation'
import { Class, Doc, Domain, Ref } from '@hcengineering/core'
import { Builder, Mixin, Model, Prop, TypeString, UX } from '@hcengineering/model'
import core, { TAttachedDoc, TClass } from '@hcengineering/model-core'
import view from '@hcengineering/view'

export { automationId } from '@hcengineering/automation'
export { automationOperation } from './migration'

export const DOMAIN_AUTOMATION = 'automation' as Domain

@Model(automation.class.Automation, core.class.AttachedDoc, DOMAIN_AUTOMATION)
@UX(automation.string.Automation)
export class TAutomation extends TAttachedDoc implements Automation<Doc> {
  @Prop(TypeString(), core.string.Name)
    name!: string

  @Prop(TypeString(), core.string.Description)
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
  builder.createDoc(
    core.class.Space,
    core.space.Model,
    {
      archived: false,
      description: 'Automation space',
      members: [],
      name: 'Automation space',
      private: true
    },
    automation.space.Automation
  )

  /** Disable Automation UI
  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'automation',
      label: automation.string.Automation,
      icon: automation.icon.Automation, // TODO: update icon
      component: plugin.component.AutomationSettingsElement,
      order: 3600,
      secured: false
    },
    plugin.ids.Automation
  )
   */

  // TODO: Enable when server triggers are added
  builder.mixin(automation.class.Automation, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })
}
