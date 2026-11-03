//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Class, type Doc, type DocumentQuery, type FindOptions, type Ref } from '@hcengineering/core'
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
  sourceQuery?: DocumentQuery<Doc>
  options?: FindOptions<Doc>
  baseOptions?: FindOptions<Doc>
  viewOptions?: ViewOptions
  _class?: Ref<Class<Doc>>
  /** Rows currently rendered, in render order. Used by export to offer "current page". */
  objects?: Doc[]
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
