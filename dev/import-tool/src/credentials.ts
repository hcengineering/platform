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

/**
 * Environment variable the import tool reads an API token from when no credentials are given on the command line.
 * Preferred over --token, because command line arguments are visible to other processes.
 */
export const API_TOKEN_ENV = 'HULY_API_TOKEN'

export type ImportCredentials = { kind: 'token', token: string } | { kind: 'password', user: string, password: string }

export interface CredentialOptions {
  user?: string
  password?: string
  token?: string
}

function isSet (value: string | undefined): value is string {
  return value !== undefined && value !== ''
}

/**
 * Picks the credentials the import tool signs in with: an API token (--token, or the HULY_API_TOKEN environment
 * variable) or an email and password (--user and --password). Credentials given on the command line take precedence
 * over the environment variable.
 * @throws Error with a message for the user when the credentials are missing or ambiguous
 */
export function resolveCredentials (
  options: CredentialOptions,
  env: Record<string, string | undefined> = process.env
): ImportCredentials {
  const { user, password, token } = options
  const hasPassword = isSet(user) || isSet(password)

  if (isSet(token)) {
    if (hasPassword) {
      throw new Error('Please provide either --token or --user and --password, not both')
    }
    return { kind: 'token', token }
  }

  if (hasPassword) {
    if (!isSet(user) || !isSet(password)) {
      throw new Error('Please provide both --user and --password')
    }
    return { kind: 'password', user, password }
  }

  const envToken = env[API_TOKEN_ENV]
  if (isSet(envToken)) {
    return { kind: 'token', token: envToken }
  }

  throw new Error(`Please provide an API token (--token or ${API_TOKEN_ENV}) or --user and --password`)
}
