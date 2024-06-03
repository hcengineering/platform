//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { getMetadata } from '@hcengineering/platform'

import print from './plugin'

export function getPrintBaseURL (): string {
  const endpoint = getMetadata(print.metadata.PrintURL)

  if (endpoint === undefined || endpoint === '') {
    throw new Error('Print service endpoint url is not configured')
  }

  return endpoint
}

export async function printToPDF (link: string, token: string): Promise<string> {
  if (token === '') {
    return ''
  }

  const url: URL = new URL(`${getPrintBaseURL()}/print`)
  url.searchParams.append('link', encodeURIComponent(link))
  url.searchParams.append('kind', 'pdf')

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
