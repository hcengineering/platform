//
// Copyright © 2023 Hardcore Engineering Inc.
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

import type { IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

export * from './types'

/**
 * @public
 */
export const diffviewId = 'diffview' as Plugin

/**
 * @public
 */
export type Diff = string

/**
 * @public
 */
export type DiffViewMode = 'unified' | 'split'

/**
 * @public
 */
export interface DiffFileId {
  fileName: string
  sha: string
}

/**
 * @public
 */
export default plugin(diffviewId, {
  component: {
    DiffView: '' as AnyComponent,
    InlineDiffView: '' as AnyComponent,
    Highlight: '' as AnyComponent
  },
  string: {
    ViewMode: '' as IntlString,
    Unified: '' as IntlString,
    Split: '' as IntlString,
    Viewed: '' as IntlString
  }
})
