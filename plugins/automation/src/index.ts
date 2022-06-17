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
export interface AutomationSupport<T extends Doc> extends Class<Doc> {
  attributes: {
    name: keyof T
    sort?: {
      groupBy?: DocumentQuery<Doc>
    }
  }[]
  trigger: {
    action: {
      mode: ('editor' | 'context')[]
    }
  }
  sort?: {
    groupBy?: DocumentQuery<T>
  }
}

/**
 * @public
 */
export interface Command {
  type: CommandType
}

/**
 * @public
 */
export interface UpdateDocCommand<T extends Doc> extends Command {
  type: CommandType.UpdateDoc
  query: DocumentUpdate<T>
}

/**
 * @public
 */
export interface Automation<T extends Doc> extends AttachedDoc {
  targetClass: Ref<Class<T>>
  trigger: {
    action?: Ref<Action>
  }
  commands: Command[]
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
    To: '' as IntlString
  },
  icon: {
    Automation: '' as Asset
  }
})
