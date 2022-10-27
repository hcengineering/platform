//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { IconSize } from '@hcengineering/ui'
import MD5 from 'crypto-js/md5'

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
export function buildGravatarId (email: string): string {
  return MD5(email.trim().toLowerCase()).toString()
}

/**
 * @public
 */
export function getGravatarUrl (
  gravatarId: string,
  size: IconSize = 'full',
  placeholder: GravatarPlaceholderType = 'identicon'
): string {
  let width = 64
  switch (size) {
    case 'inline':
    case 'tiny':
    case 'x-small':
    case 'small':
    case 'medium':
      width = 64
      break
    case 'large':
      width = 256
      break
    case 'x-large':
      width = 512
      break
  }
  return `https://gravatar.com/avatar/${gravatarId}?s=${width}&d=${placeholder}`
}
