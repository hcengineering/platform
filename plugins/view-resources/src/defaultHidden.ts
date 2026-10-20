//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type BuildModelKey } from '@hcengineering/view'

/**
 * A viewlet config entry marked with `displayProps.defaultHidden` is offered in the
 * view settings, but is not displayed until the user enables it there.
 * @public
 */
export function isDefaultHidden (key: BuildModelKey | string): boolean {
  return typeof key !== 'string' && key.displayProps?.defaultHidden === true
}

/**
 * Returns the config entry without the `defaultHidden` flag, the form stored in
 * a viewlet preference once the user enables the entry.
 * @public
 */
export function withoutDefaultHidden (key: BuildModelKey | string): BuildModelKey | string {
  if (typeof key === 'string' || key.displayProps?.defaultHidden !== true) return key
  const displayProps = { ...key.displayProps }
  delete displayProps.defaultHidden
  return { ...key, displayProps }
}
