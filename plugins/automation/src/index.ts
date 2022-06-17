import { AttachedDoc, Class, Doc, DocumentQuery, DocumentUpdate, Mixin, Ref } from '@anticrm/core'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { Action } from '@anticrm/view'

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
export interface AttributeAutomationSupport<T extends Doc> {
  name: keyof T
  sort?: {
    groupBy?: DocumentQuery<Doc>
  }
}

/**
 * @public
 */
export interface AttributeAutomationTriggerSupport<T extends Doc> extends Class<Doc> {
  name: keyof T
}

/**
 * @public
 */
export interface AutomationTriggerSupport<T extends Doc> extends Class<Doc> {
  action?: {
    mode: ('editor' | 'context')[]
  }
  attributes?: AttributeAutomationTriggerSupport<T>[]
}
/**
 * @public
 */
export interface AutomationSortSupport<T extends Doc> extends Class<Doc> {
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
  query: DocumentUpdate<T>
}

/**
 * @public
 */
export interface Automation<T extends Doc> extends AttachedDoc {
  name: string
  description?: string
  targetClass: Ref<Class<T>>
  trigger: {
    action?: Ref<Action>
  }
  commands: Command<T>[]
}

export default plugin(automationId, {
  class: {
    Automation: '' as Ref<Class<Automation<Doc>>>
  },
  mixin: {
    AutomationSupport: '' as Ref<Mixin<AutomationSupport<Doc>>>
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
    AddTrigger: '' as IntlString,
    AddMenu: '' as IntlString,
    MenuName: '' as IntlString,
    MenuMode: '' as IntlString
  },
  icon: {
    Automation: '' as Asset
  }
})
