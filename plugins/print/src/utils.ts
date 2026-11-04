//
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
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

import { getMetadata } from '@hcengineering/platform'

import print from './plugin'
import type { Doc } from '@hcengineering/core'

export function getPrintBaseURL (): string {
  const endpoint = getMetadata(print.metadata.PrintURL)

  if (endpoint === undefined || endpoint === '') {
    throw new Error('Print service endpoint url is not configured')
  }

  return endpoint
}

export type PrintPageOrientation = 'portrait' | 'landscape'

export interface PrintToPDFOptions {
  orientation?: PrintPageOrientation
}

export async function printToPDF (
  object: string | Pick<Doc, '_id' | '_class'>,
  token: string,
  options?: PrintToPDFOptions
): Promise<string> {
  if (token === '') {
    return ''
  }

  const url: URL = new URL(`${getPrintBaseURL()}/print`)
  if (typeof object === 'string') {
    url.searchParams.append('link', encodeURIComponent(object))
  } else {
    url.searchParams.set('objectId', object._id)
    url.searchParams.set('objectClass', object._class)
  }
  url.searchParams.append('kind', 'pdf')
  if (options?.orientation !== undefined) {
    url.searchParams.append('orientation', options.orientation)
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  })

  const res = await response.json()

  if (!response.ok) {
    throw new Error(res.message)
  }

  return res.id
}

export async function convertToHTML (file: string, token: string): Promise<string> {
  if (token === '') {
    return ''
  }

  const url: URL = new URL(`${getPrintBaseURL()}/convert/${file}`)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/html'
    }
  })

  const res = await response.json()

  if (!response.ok) {
    throw new Error('Failed to convert to HTML: ' + res.message)
  }

  return res.id
}
