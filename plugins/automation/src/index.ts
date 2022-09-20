import { AttachedDoc, Class, Doc, DocumentQuery, DocumentUpdate, Mixin, Ref, Space } from '@hcengineering/core'
import { Asset, IntlString, Plugin, plugin } from '@hcengineering/platform'
import { ActionCategory, ViewAction } from '@hcengineering/view'

/**
 * @public
 */
export const automationId = 'automation' as Plugin

/**
 * @public
 */
export enum CommandType {
  UpdateDoc = 'UPDATE_DOC'
}

/**
 * @public
 */
export enum TriggerType {
  Action = 'ACTION',
  Trigger = 'TRIGGER'
}

/**
 * @public
 */
export interface AttributeAutomationSupport<T extends Doc> {
  name: keyof T
  sort?: {
    groupBy?: DocumentQuery<Doc>
  }
}

/**
 * @public
 */
export interface AttributeAutomationTriggerSupport<T extends Doc> {
  name: keyof T
}

/**
 * @public
 */
export interface AutomationTriggerSupport<T extends Doc> {
  action?: {
    mode: ('editor' | 'context')[]
  }
  attributes?: AttributeAutomationTriggerSupport<T>[]
}
/**
 * @public
 */
export interface AutomationSortSupport<T extends Doc> {
  groupBy?: DocumentQuery<T>
}
/**
 * @public
 */
export interface AutomationSupport<T extends Doc> extends Class<Doc> {
  attributes: AttributeAutomationSupport<T>[]
  trigger: AutomationTriggerSupport<T>
  sort?: AutomationSortSupport<T>
}

/**
 * @public
 */
export interface Command<T extends Doc> {
  fetch?: DocumentQuery<T>
  type: CommandType
}

/**
 * @public
 */
export interface UpdateDocCommand<T extends Doc> extends Command<T> {
  type: CommandType.UpdateDoc
  targetClass: Ref<Class<T>>
  update: DocumentUpdate<T>
}

/**
 * @public
 */
export function isUpdateDocCommand (command: Command<Doc>): command is UpdateDocCommand<Doc> {
  return command.type === CommandType.UpdateDoc
}

/**
 * @public
 */
export interface Automation<T extends Doc> extends AttachedDoc {
  name: string
  description: string | null
  targetClass: Ref<Class<T>> | null
  trigger: {
    type: TriggerType
  }
  commands: Command<T>[]
}

/**
 * @public
 */
export interface PerformAutomationProps {
  automationId: Ref<Automation<Doc>>
  automationClass: Ref<Class<Automation<Doc>>>
}

export default plugin(automationId, {
  class: {
    Automation: '' as Ref<Class<Automation<Doc>>>
  },
  action: {
    PerformAutomation: '' as ViewAction<PerformAutomationProps>
  },
  mixin: {
    AutomationSupport: '' as Ref<Mixin<AutomationSupport<Doc>>>
  },
  category: {
    Automation: '' as Ref<ActionCategory>
  },
  string: {
    Automation: '' as IntlString,
    Actions: '' as IntlString,
    Chat: '' as IntlString,
    Content: '' as IntlString,
    Dates: '' as IntlString,
    Tracker: '' as IntlString,
    Trigger: '' as IntlString,
    Set: '' as IntlString,
    To: '' as IntlString,
    AddMenu: '' as IntlString,
    Menu: '' as IntlString,
    Mode: '' as IntlString,
    Icon: '' as IntlString,
    SelectClass: '' as IntlString,
    In: '' as IntlString,
    Update: '' as IntlString
  },
  icon: {
    Automation: '' as Asset
  },
  space: {
    Automation: '' as Ref<Space>
  }
})
