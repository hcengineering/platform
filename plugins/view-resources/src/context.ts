import { ViewContext, ViewContextType } from '@hcengineering/view'
import { writable } from 'svelte/store'

/**
 * @public
 */
export class ContextStore {
  constructor (readonly contexts: ViewContext[]) {}

  getLastContext (): ViewContext | undefined {
    return this.contexts[this.contexts.length - 1]
  }

  isIncludes (type: ViewContextType): boolean {
    return (
      this.contexts.find((it) => it.mode === type || (Array.isArray(it.mode) && it.mode.includes(type))) !== undefined
    )
  }
}
/**
 * @public
 */
export const contextStore = writable<ContextStore>(new ContextStore([]))
