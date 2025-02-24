//
// Copyright © 2024 Hardcore Engineering, Inc.
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
import { IncomingHttpHeaders } from 'http'

export function getHost (headers: IncomingHttpHeaders): string | undefined {
  let host: string | undefined
  const origin = headers.origin ?? headers.referer
  if (origin !== undefined) {
    host = new URL(origin).host
  }

  return host
}

export interface AuthState {
  inviteId?: string
  branding?: string
}

export function safeParseAuthState (rawState: string | undefined): AuthState {
  if (rawState == null) {
    return {}
  }

  try {
    return JSON.parse(decodeURIComponent(rawState))
  } catch {
    return {}
  }
}
