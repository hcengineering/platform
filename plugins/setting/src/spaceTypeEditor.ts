//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Class, SpaceType, SpaceTypeDescriptor } from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 *
 * A mixin describing various configurations of a space type editor
 */
export interface SpaceTypeEditor extends Class<SpaceType> {
  sections: SpaceTypeEditorSection[]
  subEditors?: Record<string, AnyComponent>
}

/**
 * @public
 *
 * Describes one space type editor section
 */
export interface SpaceTypeEditorSection {
  id: string
  label: IntlString
  component: AnyComponent
  withoutContainer?: boolean
}

/**
 * @public
 *
 * A mixin for extensions during space type creation
 */
export interface SpaceTypeCreator extends Class<SpaceTypeDescriptor> {
  extraComponent: AnyComponent
}
