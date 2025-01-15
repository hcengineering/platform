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
  if (val.hostname === undefined) {
    return false
  }
  if (val.image === undefined && val.description === undefined) {
    return false
  }
  if (val.title === undefined && val.description === undefined) {
    return false
  }
  return true
}

export async function fetchLinkPreviewDetails (url: string, timeoutMs = 15000): Promise<LinkPreviewDetails> {
  try {
    const linkPreviewUrl = getMetadata(plugin.metadata.LinkPreviewUrl)
    let token: string = ''
    if (getMetadata(plugin.metadata.Token) !== undefined) {
      token = getMetadata(plugin.metadata.Token) as string
    }
    const response = await fetch(`${linkPreviewUrl}/details?q=${url}`, {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(timeoutMs)
    })
    return response.json() as LinkPreviewDetails
  } catch {
    return {}
  }
}
