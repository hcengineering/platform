import { AttachedDoc, Class, Doc, DocumentQuery, DocumentUpdate, Ref } from '@anticrm/core'
import type { IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { Action } from '@anticrm/view'
import type { KeysByType } from 'simplytyped'

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
export interface AutomationSupport<T extends Doc> {
  attributes: {
    name: KeysByType<T, never>
    sort?: {
      groupBy?: DocumentQuery<Doc>
    }
  }[]
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
  string: {
    Automation: '' as IntlString
  }
})
