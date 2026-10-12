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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { concatLink } from '@hcengineering/core'
import { loginId } from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'

/** Builds the public join URL for an invite link. */
export function getInviteLinkUrl (inviteId: string, navigateUrl?: string): string {
  const loc = getCurrentLocation()
  loc.path[0] = loginId
  loc.path[1] = 'join'
  loc.path.length = 2
  loc.query = {
    inviteId
  }
  if (navigateUrl !== undefined) {
    loc.query.navigateUrl = navigateUrl
  }
  loc.fragment = undefined

  const url = locationToUrl(loc)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const host = frontUrl ?? document.location.origin
  return concatLink(host, url)
}
