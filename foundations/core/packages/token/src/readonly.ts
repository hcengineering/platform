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

import { encode } from 'jwt-simple'
import { getSecret } from './secret'
import { decodeToken, TokenError, type Token } from './token'

/** Create a short-lived read-only derivative without adding the signing service's privileges. @public */
export function generateReadOnlyToken (source: string, lifetimeSeconds: number, secret?: string): string {
  if (!Number.isFinite(lifetimeSeconds) || lifetimeSeconds <= 0) {
    throw new TokenError('Token lifetime must be positive')
  }
  const token = decodeToken(source, true, secret)
  const expires = Math.floor(Date.now() / 1000) + Math.ceil(lifetimeSeconds)
  const restricted: Token = {
    ...token,
    extra: { ...token.extra, readonly: 'true' },
    exp: Math.min(token.exp ?? expires, expires)
  }
  return encode(restricted, secret ?? getSecret())
}
