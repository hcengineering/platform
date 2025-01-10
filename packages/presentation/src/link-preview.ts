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
import presentation from './plugin'

export function isLinkPreviewEnabled (): boolean {
  return getMetadata(presentation.metadata.LinkPreviewUrl) !== undefined
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
  if (val.hostname === undefined && val.title === undefined) {
    return false
  }
  if (val.image === undefined && val.description === undefined) {
    return false
  }
  return true
}

export async function fetchLinkPreviewDetails (url: string): Promise<LinkPreviewDetails> {
  try {
    const linkPreviewUrl = getMetadata(presentation.metadata.LinkPreviewUrl)
    const response = await fetch(`${linkPreviewUrl}?q=${url}`, {
      signal: AbortSignal.timeout(5 * 1000)
    })
    if (!response.ok) {
      throw new Error(`status: ${response.status}`)
    }
    console.log(response)
    return response.json() as LinkPreviewDetails
  } catch (error) {
    console.error(`An error occurced on fetching or parsing data by ${url}, error:`, error)
    return {}
  }
}
