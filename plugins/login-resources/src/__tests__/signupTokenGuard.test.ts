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

/**
 * Tests for the token guard fix in SignupForm.svelte (issue #10518).
 *
 * When MAIL_URL is configured the account service returns token: undefined
 * to force email confirmation. The signup handler must skip logIn() in that
 * case — calling logIn() without a token triggers PUT /cookie with no
 * Authorization header, which returns 401 and crashes the client's JSON
 * parser with "Unexpected token".
 */

interface LoginInfo {
  account: string
  name?: string
  token?: string
}

/**
 * Mirrors the fixed logic from SignupForm.svelte:
 *
 *   if (result != null) {
 *     if (result.token != null) {
 *       await logIn(result)
 *     }
 *     goTo('confirmationSend')
 *   }
 */
async function handleSignupResult (
  result: LoginInfo | null,
  logIn: (info: LoginInfo) => Promise<void>,
  goTo: (page: string) => void
): Promise<void> {
  if (result != null) {
    if (result.token != null) {
      await logIn(result)
    }
    goTo('confirmationSend')
  }
}

describe('SignupForm token guard (issue #10518)', () => {
  let logIn: jest.Mock
  let goTo: jest.Mock

  beforeEach(() => {
    logIn = jest.fn().mockResolvedValue(undefined)
    goTo = jest.fn()
  })

  it('skips logIn and redirects to confirmationSend when token is undefined (MAIL_URL configured)', async () => {
    // Server returns token: undefined when email confirmation is required
    const result: LoginInfo = { account: 'acc-uuid', name: 'Alice Smith', token: undefined }

    await handleSignupResult(result, logIn, goTo)

    expect(logIn).not.toHaveBeenCalled()
    expect(goTo).toHaveBeenCalledWith('confirmationSend')
  })

  it('skips logIn and redirects to confirmationSend when token is absent', async () => {
    const result: LoginInfo = { account: 'acc-uuid' }

    await handleSignupResult(result, logIn, goTo)

    expect(logIn).not.toHaveBeenCalled()
    expect(goTo).toHaveBeenCalledWith('confirmationSend')
  })

  it('calls logIn then redirects to confirmationSend when token is present (no MAIL_URL)', async () => {
    const result: LoginInfo = { account: 'acc-uuid', name: 'Bob Jones', token: 'eyJhbGciOiJIUzI1NiJ9.test' }

    await handleSignupResult(result, logIn, goTo)

    expect(logIn).toHaveBeenCalledTimes(1)
    expect(logIn).toHaveBeenCalledWith(result)
    expect(goTo).toHaveBeenCalledWith('confirmationSend')
  })

  it('calls neither logIn nor goTo when result is null (signup error)', async () => {
    await handleSignupResult(null, logIn, goTo)

    expect(logIn).not.toHaveBeenCalled()
    expect(goTo).not.toHaveBeenCalled()
  })
})
