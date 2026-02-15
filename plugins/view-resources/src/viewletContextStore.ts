import { type Class, type Doc, type DocumentQuery, type Ref } from '@hcengineering/core'
import { type BuildModelKey, type Viewlet, type ViewOptions } from '@hcengineering/view'
import { writable } from 'svelte/store'
import type { CopyRelationshipTableAsMarkdownProps } from '@hcengineering/converter'

/**
 * Context for the current viewlet table being displayed
 * Used by copy actions to get viewlet config without prop threading
 * @public
 */
export interface ViewletContext {
  id?: Ref<Doc> // Internal ID for tracking context lifecycle
  viewlet?: Viewlet
  config?: Array<string | BuildModelKey>
  query?: DocumentQuery<Doc>
  viewOptions?: ViewOptions
  _class?: Ref<Class<Doc>>
  relationshipTableData?: CopyRelationshipTableAsMarkdownProps
}

/**
 * Store for current viewlet context
 * Stack-based similar to contextStore to support nested views
 * @public
 */
export class ViewletContextStore {
  constructor (readonly contexts: ViewletContext[]) {}

  getLastContext (): ViewletContext | undefined {
    return this.contexts[this.contexts.length - 1]
  }
}

/**
 * @public
 */
export const viewletContextStore = writable<ViewletContextStore>(new ViewletContextStore([]))
