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

import type { AccountClient } from '@hcengineering/account-client'
import { type AccountUuid, SocialIdType } from '@hcengineering/core'
import { ERROR, OK, PlatformError, Severity, Status } from '@hcengineering/platform'

import documents from './plugin'

/**
 * Credentials used to re-authenticate the signer.
 * Accounts without a password (e.g. SSO-only accounts) confirm with a one-time code sent to their email.
 */
export type SignatureCredentials =
  | { method: 'password', email: string, password: string }
  | { method: 'otp', email: string, code: string }

export interface SignatureConfirmation {
  method: SignatureCredentials['method']
  email: string
}

/** Loads the dialog's confirmation mode and a verified email from the authenticated account service. */
export async function loadSignatureConfirmation (
  accountClient: Pick<AccountClient, 'checkHasPassword' | 'getSocialIds'>,
  currentAccount: AccountUuid
): Promise<SignatureConfirmation> {
  let hasPassword = true
  try {
    hasPassword = await accountClient.checkHasPassword()
  } catch {
    // Keep password confirmation if the account service cannot determine the mode.
  }

  const socialIds = await accountClient.getSocialIds()
  const email =
    socialIds.find(
      (si) =>
        si.personUuid === currentAccount &&
        si.type === SocialIdType.EMAIL &&
        si.verifiedOn != null &&
        si.verifiedOn > 0 &&
        si.isDeleted !== true &&
        si.value.trim().length > 0
    )?.value ?? ''

  return { method: hasPassword === false ? 'otp' : 'password', email }
}

/**
 * Re-authenticates the signer and checks that the credentials belong to the current account.
 */
export async function verifySignatureCredentials (
  accountClient: Pick<AccountClient, 'login' | 'validateOtp'>,
  credentials: SignatureCredentials,
  currentAccount: AccountUuid
): Promise<Status> {
  try {
    const info =
      credentials.method === 'otp'
        ? await accountClient.validateOtp(credentials.email, credentials.code)
        : await accountClient.login(credentials.email, credentials.password)

    if (info.account !== currentAccount) {
      return new Status(Severity.ERROR, documents.string.SignatureAccountMismatch, {})
    }

    return OK
  } catch (err: any) {
    if (err instanceof PlatformError) {
      return err.status
    } else {
      return ERROR
    }
  }
}
