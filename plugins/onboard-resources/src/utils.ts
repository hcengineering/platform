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

import { type LoginInfo } from '@hcengineering/login'
import {
  getWorkspaces,
  navigateToWorkspace,
  selectWorkspace,
  type Pages as LoginPages
} from '@hcengineering/login-resources'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { type Location, getCurrentLocation, locationToUrl, navigate } from '@hcengineering/ui'

import { type Pages } from './index'

export function getLoc (path: Pages): Location {
  const loc = getCurrentLocation()
  loc.path[1] = path
  loc.path.length = 2
  return loc
}

export function goTo (path: Pages, clearQuery: boolean = false): void {
  const loc = getLoc(path)
  if (clearQuery) {
    loc.query = undefined
  }
  navigate(loc)
}

export function goToLogin (page: LoginPages, clearQuery: boolean = false): void {
  const loc = getCurrentLocation()
  loc.path[0] = 'login'
  loc.path[1] = page
  loc.path.length = 2
  if (clearQuery) {
    loc.query = undefined
  }
  navigate(loc, clearQuery)
}

export function getHref (path: Pages): string {
  const url = locationToUrl(getLoc(path))
  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const host = frontUrl ?? document.location.origin
  return host + url
}

export async function ensureConfirmed (account: LoginInfo): Promise<void> {
  if (account.token === undefined) {
    const loc = getCurrentLocation()
    loc.path[0] = 'login'
    loc.path[1] = 'confirmationSend'
    loc.path.length = 2
    navigate(loc)
  }
}

export async function afterConfirm (clearQuery = false): Promise<void> {
  const joinedWS = await getWorkspaces()
  if (joinedWS.length === 0) {
    goTo('onboard', clearQuery)
  } else if (joinedWS.length === 1) {
    const result = (await selectWorkspace(joinedWS[0].url, null))[1]
    if (result !== undefined) {
      navigateToWorkspace(joinedWS[0].url, result, undefined, clearQuery)
    }
  } else {
    goToLogin('selectWorkspace', clearQuery)
  }
}
