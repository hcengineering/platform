// Copyright © 2025 Hardcore Engineering Inc.
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

import type { Ref } from '@hcengineering/core'
import type { MasterTag } from '@hcengineering/card'
import type { LabelID } from '@hcengineering/communication-types'
import { type Heading } from '@hcengineering/text-editor'

interface BaseNavigatorConfig {
  types: Array<Ref<MasterTag>>
  groupBySpace?: boolean
  savedViews?: boolean
  allowCreate?: boolean // for now works only when groupBySpace is true
  preorder?: Array<{ type: Ref<MasterTag>, order: number }>
}

export interface TypesNavigatorConfig extends BaseNavigatorConfig {
  variant: 'types'
  hierarchyDepth?: number
}

type Sorting = 'alphabetical' | 'recent'
export interface CardsNavigatorConfig extends BaseNavigatorConfig {
  variant: 'cards'
  limit: number
  hideEmpty?: boolean
  labelFilter?: LabelID[]
  fixedTypes?: Array<Ref<MasterTag>>
  defaultSorting?: Sorting
  specialSorting?: Record<Ref<MasterTag>, Sorting>
}

export type NavigatorConfig = TypesNavigatorConfig | CardsNavigatorConfig

export interface CardTocAction {
  id: 'toc'
  toc: Heading[]
}

export interface CardOverlayAction {
  id: 'overlay'
  show: boolean
}

export type CardSectionAction = CardTocAction | CardOverlayAction
