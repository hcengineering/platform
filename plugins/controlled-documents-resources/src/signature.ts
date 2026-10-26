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

import { Analytics } from '@hcengineering/analytics'
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
  } catch (err: any) {
    Analytics.handleError(err)
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

  switch (hasPassword) {
    case false:
      return { method: 'otp', email }
    default:
      return { method: 'password', email }
  }
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
    Analytics.handleError(err)
    if (err instanceof PlatformError) {
      return err.status
    } else {
      return ERROR
    }
  }
}

/** Shared by send and verify so a slow RPC cannot consume guesses through repeated dialog submissions. */
export class SignatureRequests {
  pending: 'send' | 'verify' | undefined
  retryOn = 0
  codeRequested = false
  status = OK

  constructor (
    private readonly client: Pick<AccountClient, 'login' | 'validateOtp' | 'loginOtp'>,
    private readonly account: AccountUuid,
    private readonly onChange: (state: SignatureRequests) => void
  ) {}

  async sendCode (email: string): Promise<void> {
    if (this.pending !== undefined || email.trim() === '' || this.retryOn > Date.now()) return
    this.pending = 'send'
    this.onChange(this)
    try {
      const info = await this.client.loginOtp(email)
      this.retryOn = info.retryOn
      this.codeRequested = info.sent
      this.status = OK
    } catch (err: any) {
      Analytics.handleError(err)
      this.status = err instanceof PlatformError ? err.status : ERROR
    } finally {
      this.pending = undefined
      this.onChange(this)
    }
  }

  async verify (credentials: SignatureCredentials): Promise<boolean> {
    if (this.pending !== undefined) return false
    this.pending = 'verify'
    this.onChange(this)
    try {
      this.status = await verifySignatureCredentials(this.client, credentials, this.account)
      return this.status === OK
    } finally {
      this.pending = undefined
      this.onChange(this)
    }
  }
}
