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

import type { AccountID, SocialID } from '@hcengineering/communication-types'
import { generateToken } from '@hcengineering/server-token'
import { systemAccountUuid } from '@hcengineering/core'

import type { TriggerCtx } from './types'

export async function findAccount(ctx: TriggerCtx, socialString: SocialID): Promise<AccountID | undefined> {
  if (ctx.account.socialIds.includes(socialString)) {
    return ctx.account.uuid
  }

  const token = generateToken(systemAccountUuid)
  // const account = getAccountClient(ctx.metadata.accountsUrl, token)

  try {
    //TODO: FIXME
    return await fetchAccount(socialString, ctx.metadata.accountsUrl, token)
  } catch (err: any) {
    ctx.ctx.warn('Cannot find account', { socialString, err })
  }
}

//TODO: replace with AccountClient
async function fetchAccount(socialId: SocialID, url: string, token: string): Promise<AccountID | undefined> {
  const body = {
    method: 'findPersonBySocialId' as const,
    params: { socialId, requireAccount: true }
  }
  const request: RequestInit = {
    keepalive: true,
    headers: {
      ...(token === undefined
        ? {}
        : {
            Authorization: 'Bearer ' + token
          })
    }
  }

  const response = await fetch(url, {
    ...request,
    headers: {
      ...request.headers,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(body)
  })

  const result = await response.json()
  if (result.error != null) {
    throw Error(result.error)
  }

  return result.result as AccountID | undefined
}
