import { type ViewContext, type ViewContextType } from '@hcengineering/view'
import { writable } from 'svelte/store'

/**
 * @public
 */
export class ContextStore {
  constructor (readonly contexts: ViewContext[]) {}

  getLastContext (): ViewContext | undefined {
    return this.contexts[this.contexts.length - 1]
  }
}
/**
 * @public
 */
export const contextStore = writable<ContextStore>(new ContextStore([]))
