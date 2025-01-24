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
import { getMetadata } from '@hcengineering/platform'
import plugin from './plugin'

export function isLinkPreviewEnabled (): boolean {
  return getMetadata(plugin.metadata.LinkPreviewUrl) !== undefined
}
export interface LinkPreviewDetails {
  title?: string
  description?: string
  url?: string
  icon?: string
  image?: string
  charset?: string
  hostname?: string
  host?: string
}

export function canDisplayLinkPreview (val: LinkPreviewDetails): boolean {
  if (isEmpty(val.host) && isEmpty(val.title)) {
    return false
  }
  if (isEmpty(val.description) && isEmpty(val.image)) {
    return false
  }

  return true
}

export async function fetchLinkPreviewDetails (
  url: string,
  timeoutMs = 5000,
  fetcher = fetch
): Promise<LinkPreviewDetails> {
  try {
    const linkPreviewUrl = getMetadata(plugin.metadata.LinkPreviewUrl)
    const headers = new Headers()
    if (getMetadata(plugin.metadata.Token) !== undefined) {
      const token = getMetadata(plugin.metadata.Token) as string
      headers.set('Authorization', 'Bearer ' + token)
    }
    const response = await fetcher(`${linkPreviewUrl}/details?q=${url}`, {
      headers,
      signal: AbortSignal.timeout(timeoutMs)
    })
    const res = (await response.json()) as LinkPreviewDetails
    res.url = url
    return res
  } catch {
    return {}
  }
}

function isEmpty (str: string | undefined): boolean {
  return str === undefined || str.trim() === ''
}
