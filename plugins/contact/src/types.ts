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

import { ColorDefinition } from '@hcengineering/ui'

/**
 * @public
 */
export type GravatarPlaceholderType =
  | '404'
  | 'mp'
  | 'identicon'
  | 'monsterid'
  | 'wavatar'
  | 'retro'
  | 'robohash'
  | 'blank'

/**
 * @public
 */
export const AVATAR_COLORS: ColorDefinition[] = [
  { name: 'blue', color: '#4674ca' }, // blue
  { name: 'blue_dark', color: '#315cac' }, // blue_dark
  { name: 'green', color: '#57be8c' }, // green
  { name: 'green_dark', color: '#3fa372' }, // green_dark
  { name: 'yellow_orange', color: '#f9a66d' }, // yellow_orange
  { name: 'red', color: '#ec5e44' }, // red
  { name: 'red_dark', color: '#e63717' }, // red_dark
  { name: 'pink', color: '#f868bc' }, // pink
  { name: 'purple', color: '#6c5fc7' }, // purple
  { name: 'purple_dark', color: '#4e3fb4' }, // purple_dark
  { name: 'teal', color: '#57b1be' }, // teal
  { name: 'gray', color: '#847a8c' } // gray
]
