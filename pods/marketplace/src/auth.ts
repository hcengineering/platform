// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { getClient } from '@hcengineering/account-client'
import { docGuestAccountUuid, readOnlyGuestAccountUuid, systemAccountUuid, type AccountUuid } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'
import { decodeToken } from '@hcengineering/server-token'
import { CatalogError } from './errors'

export interface CatalogAccount {
  uuid: AccountUuid
  name: string
}

/** Resolve recipients through the configured account authority and verified registered email identities. */
export function createRecipientResolver (accountsUrl: string): (token: string, email: string) => Promise<AccountUuid> {
  return async (token, email) => {
    try {
      const account = await getClient(accountsUrl, token).resolveAccountByEmail(email)
      if (
        account === undefined ||
        [systemAccountUuid, readOnlyGuestAccountUuid, docGuestAccountUuid].includes(account)
      ) {
        throw new CatalogError(404, 'No registered account with this verified email')
      }
      return account
    } catch (error) {
      if (error instanceof CatalogError) throw error
      if (error instanceof PlatformError) throw new CatalogError(400, 'The recipient could not be verified')
      throw new CatalogError(503, 'The account service is unavailable')
    }
  }
}

/** Uses the configured account authority, never an account URL supplied by the request. */
export function createAuthenticator (accountsUrl: string, secret: string): (token: string) => Promise<CatalogAccount> {
  return async (token) => {
    let account: AccountUuid
    try {
      const decoded = decodeToken(token, true, secret)
      if (
        decoded.grant !== undefined ||
        decoded.extra?.service !== undefined ||
        decoded.extra?.apiKey !== undefined ||
        decoded.extra?.readonly === 'true' ||
        decoded.extra?.guest === 'true' ||
        [systemAccountUuid, readOnlyGuestAccountUuid, docGuestAccountUuid].includes(decoded.account)
      ) {
        throw new CatalogError(401, 'Sign in with a registered account')
      }
      account = decoded.account
      if (typeof account !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(account)) {
        throw new CatalogError(401, 'Invalid account identity')
      }
    } catch {
      throw new CatalogError(401, 'Sign in with a registered account')
    }
    try {
      const client = getClient(accountsUrl, token)
      await client.getAccountInfo(account)
      const person = await client.getPerson()
      return {
        uuid: account,
        name: `${person.firstName} ${person.lastName}`.trim().slice(0, 200) || account.slice(0, 8)
      }
    } catch (error) {
      if (error instanceof PlatformError) throw new CatalogError(401, 'The account could not be verified')
      throw new CatalogError(503, 'The account service is unavailable')
    }
  }
}
