//
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
//

import { getResource } from '@hcengineering/platform'
import { workbenchPlugin as plugin } from './plugin'

/** @public */
export async function logIn (loginInfo: { account: string, token?: string }): Promise<void> {
  const res = await getResource(plugin.function.LogIn)
  await res(loginInfo)
}

/** @public */
export async function logOut (): Promise<void> {
  const res = await getResource(plugin.function.LogOut)
  await res()
}
