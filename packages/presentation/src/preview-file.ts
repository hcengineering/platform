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

import { getFileUrl } from './file'
import { getMetadata } from '@hcengineering/platform'
import presentation from './plugin'

/** Fetch a preview source with workspace authorization, rejecting HTTP failures. @public */
export async function fetchPreviewFile (
  file: string,
  name: string,
  options: Pick<RequestInit, 'method' | 'signal'> = {}
): Promise<Response> {
  const token = getMetadata(presentation.metadata.Token)
  const headers: HeadersInit = {}
  // Only storage identities may receive the workspace token; external URLs are untrusted.
  if (!file.includes('://') && token !== undefined && token !== '') {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(getFileUrl(file, name), {
    ...options,
    credentials: 'omit',
    headers
  })
  if (!response.ok) throw new Error(`File could not be loaded (HTTP ${response.status})`)
  return response
}
